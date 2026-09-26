import assert from "node:assert/strict";
import test from "node:test";
import axios from "axios";

import {
  ABID_AIR_SUPPLIER_NAME,
  checkAvailability,
  createBooking,
  formatAbidAirPassengers,
  getAbidAirHttpStatus,
  normalizeAbidAirGroup,
  normalizeAbidAirPackage,
  toIsoDate,
} from "../utils/Abid-Air.js";

test("normalizes Abid Air group inventory without replacing its ID", () => {
  const group = normalizeAbidAirGroup({
    id: "supplier-group-id",
    groupCode: "AA-100",
    type: "Umrah Groups",
    sector: "LHE-JED-LHE",
    airline: "PIA",
    availableSeats: 4,
    fares: { adult: 100, child: 80, infant: 20 },
    flights: [],
  });

  assert.equal(group.id, "supplier-group-id");
  assert.equal(group.externalId, "supplier-group-id");
  assert.equal(group.source, "abid-air");
  assert.equal(group.isOwnGroup, false);
  assert.equal(group.supplierName, ABID_AIR_SUPPLIER_NAME);
  assert.deepEqual(
    [group.price, group.childPrice, group.infantPrice],
    [100, 80, 20],
  );
});

test("normalizes Abid Air package source and package totals", () => {
  const pkg = normalizeAbidAirPackage({
    id: "supplier-package-id",
    name: "21 Day Package",
    availableRooms: 3,
    packageTotals: { sharing: 220, childWithBed: 150 },
  });

  assert.equal(pkg.id, "supplier-package-id");
  assert.equal(pkg.packageSource, "abid-air");
  assert.equal(pkg.source, "abid-air");
  assert.equal(pkg.packageTotals.shared, 220);
  assert.equal(pkg.packageTotals.childWithBed, 150);
});

test("maps passenger dates and titles for Abid Air", () => {
  const [passenger] = formatAbidAirPassengers(
    [
      {
        type: "Adult",
        title: "Mr",
        givenName: "Muhammad",
        surName: "Ali",
        passport: "AB123",
        nationality: "Pakistan",
        dateOfBirth: "1990-05-15T12:00:00.000Z",
        passportExpiry: new Date("2032-05-31T00:00:00.000Z"),
      },
    ],
    { isUmrah: true },
  );

  assert.equal(passenger.title, "MR");
  assert.equal(passenger.dateOfBirth, "1990-05-15");
  assert.equal(passenger.passportExpiry, "2032-05-31");
  assert.equal("passportIssue" in passenger, false);
});

test("defaults an Umrah child to without-bed pricing", () => {
  const [passenger] = formatAbidAirPassengers(
    [
      {
        type: "Child",
        givenName: "A",
        surName: "B",
        passport: "C123",
        nationality: "Pakistan",
        dateOfBirth: "2018-01-01",
        passportExpiry: "2030-01-01",
      },
    ],
    { isUmrah: true },
  );

  assert.equal(passenger.title, "CHD");
  assert.equal(passenger.childType, "withoutBed");
});

test("rejects missing supplier-required passenger data", () => {
  assert.throws(
    () =>
      formatAbidAirPassengers([
        { type: "Adult", title: "MR", givenName: "A" },
      ]),
    /surName, passport, nationality/,
  );
});

test("preserves supplier-facing error statuses", () => {
  assert.equal(getAbidAirHttpStatus({ status: 409 }), 409);
  assert.equal(getAbidAirHttpStatus({ status: 422 }), 422);
  assert.equal(getAbidAirHttpStatus({ status: 429 }), 429);
  assert.equal(getAbidAirHttpStatus({ status: 500 }), 502);
  assert.equal(toIsoDate("not-a-date"), null);
});

test("propagates the availability token without logging passenger data", async () => {
  const originalAdapter = axios.defaults.adapter;
  const originalKey = process.env.ABID_AIR_API_KEY;
  const calls = [];
  process.env.ABID_AIR_API_KEY = "test-key-that-must-not-be-logged";
  axios.defaults.adapter = async (config) => {
    calls.push(config);
    if (config.url === "/availability") {
      return {
        data: { data: { availabilityToken: "five-minute-token" } },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    return {
      data: { data: { _id: "supplier-booking-id", status: "on hold" } },
      status: 201,
      statusText: "Created",
      headers: {},
      config,
    };
  };

  try {
    const availability = await checkAvailability({
      inventoryId: "inventory-id",
      adults: 1,
      children: 0,
      infants: 0,
    });
    const booking = await createBooking(
      {
        inventoryId: "inventory-id",
        contactPersonName: "Test Person",
        passengers: [{ passport: "SECRET-PASSPORT" }],
      },
      availability.token,
    );

    assert.equal(booking._id, "supplier-booking-id");
    assert.equal(calls[1].headers.get("X-Availability-Token"), "five-minute-token");
  } finally {
    axios.defaults.adapter = originalAdapter;
    if (originalKey === undefined) delete process.env.ABID_AIR_API_KEY;
    else process.env.ABID_AIR_API_KEY = originalKey;
  }
});

test("extracts structured API errors and emits only redacted diagnostics", async () => {
  const originalAdapter = axios.defaults.adapter;
  const originalKey = process.env.ABID_AIR_API_KEY;
  const originalConsoleError = console.error;
  const logs = [];
  process.env.ABID_AIR_API_KEY = "secret-api-key";
  console.error = (...args) => logs.push(args);
  axios.defaults.adapter = async (config) => {
    const error = new Error("Request failed");
    error.response = {
      status: 429,
      data: {
        success: false,
        error: { code: "RATE_LIMITED", message: "Slow down" },
      },
      headers: {
        "retry-after": "30",
        "x-request-id": "request-123",
        "x-correlation-id": "correlation-456",
      },
      config,
    };
    throw error;
  };

  try {
    await assert.rejects(
      () =>
        createBooking(
          {
            inventoryId: "inventory-id",
            contactPersonName: "Test Person",
            passengers: [{ passport: "SECRET-PASSPORT" }],
          },
          "token",
        ),
      (error) => {
        assert.equal(error.status, 429);
        assert.equal(error.code, "RATE_LIMITED");
        assert.equal(error.retryAfter, "30");
        assert.equal(error.requestId, "request-123");
        assert.equal(error.correlationId, "correlation-456");
        return true;
      },
    );
    const serializedLogs = JSON.stringify(logs);
    assert.equal(serializedLogs.includes("secret-api-key"), false);
    assert.equal(serializedLogs.includes("SECRET-PASSPORT"), false);
  } finally {
    axios.defaults.adapter = originalAdapter;
    console.error = originalConsoleError;
    if (originalKey === undefined) delete process.env.ABID_AIR_API_KEY;
    else process.env.ABID_AIR_API_KEY = originalKey;
  }
});
