import axios from "axios";

export const ABID_AIR_SOURCE = "abid-air";
export const ABID_AIR_SUPPLIER_NAME = "Abid Air International";

const DEFAULT_BASE_URL = "https://abidairtravels.com/api/external/v1";
const DEFAULT_TIMEOUT = 30000;

const getClient = () => {
  const apiKey = process.env.ABID_AIR_API_KEY;
  if (!apiKey) {
    const error = new Error("Abid Air API is not configured");
    error.status = 503;
    error.code = "ABID_AIR_NOT_CONFIGURED";
    throw error;
  }

  return axios.create({
    baseURL: process.env.ABID_AIR_API_URL || DEFAULT_BASE_URL,
    timeout: Number(process.env.ABID_AIR_API_TIMEOUT) || DEFAULT_TIMEOUT,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });
};

const getHeader = (headers, names) => {
  for (const name of names) {
    const value = headers?.[name] ?? headers?.[name.toLowerCase()];
    if (value !== undefined) return value;
  }
  return null;
};

const makeAbidAirError = (error, endpoint) => {
  const response = error.response;
  const responseData = response?.data;
  const supplierError = responseData?.error;
  const enhancedError = new Error(
    supplierError?.message ||
      responseData?.message ||
      error.message ||
      "Abid Air API request failed",
  );

  enhancedError.name = "AbidAirApiError";
  enhancedError.status = response?.status || (error.request ? 502 : 500);
  enhancedError.code =
    supplierError?.code ||
    responseData?.code ||
    (error.request ? "ABID_AIR_NO_RESPONSE" : "ABID_AIR_REQUEST_FAILED");
  enhancedError.retryAfter = getHeader(response?.headers, ["retry-after"]);
  enhancedError.requestId = getHeader(response?.headers, [
    "x-request-id",
    "request-id",
  ]);
  enhancedError.correlationId = getHeader(response?.headers, [
    "x-correlation-id",
    "correlation-id",
  ]);
  enhancedError.endpoint = endpoint;
  enhancedError.responseData = responseData || null;

  console.error("Abid Air API error", {
    endpoint,
    status: enhancedError.status,
    code: enhancedError.code,
    requestId: enhancedError.requestId,
    correlationId: enhancedError.correlationId,
  });

  return enhancedError;
};

const request = async (method, endpoint, { params, data, headers } = {}) => {
  try {
    return await getClient().request({
      method,
      url: endpoint,
      params,
      data,
      headers,
    });
  } catch (error) {
    if (error.code === "ABID_AIR_NOT_CONFIGURED") throw error;
    throw makeAbidAirError(error, endpoint);
  }
};

const fetchAllPages = async (endpoint, params = {}) => {
  const firstResponse = await request("get", endpoint, {
    params: { ...params, page: params.page || 1, limit: params.limit || 100 },
  });
  const firstData = firstResponse.data?.data || [];
  const meta = firstResponse.data?.meta || {};
  const pages = Number(meta.pages) || 1;

  if (params.page || pages <= 1) return firstData;

  const remaining = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) =>
      request("get", endpoint, {
        params: { ...params, page: index + 2, limit: params.limit || 100 },
      }).then((response) => response.data?.data || []),
    ),
  );

  return [firstData, ...remaining].flat();
};

export const getGroupTicketing = (params = {}) =>
  fetchAllPages("/group-ticketing", params);

export const getGroupTicketingById = async (id) => {
  const response = await request(
    "get",
    `/group-ticketing/${encodeURIComponent(id)}`,
  );
  return response.data?.data;
};

export const getUmrahPackages = (params = {}) =>
  fetchAllPages("/umrah-packages", params);

export const getUmrahPackageById = async (id) => {
  const response = await request(
    "get",
    `/umrah-packages/${encodeURIComponent(id)}`,
  );
  return response.data?.data;
};

export const checkAvailability = async ({
  inventoryId,
  adults,
  children,
  requireToken = false,
}) => {
  const response = await request("post", "/availability", {
    data: {
      inventoryId: String(inventoryId),
      adults: Number(adults) || 0,
      children: Number(children) || 0,
      // Infants do not occupy inventory seats/room slots. Keep them out of
      // Abid Air availability checks; the booking payload still sends infant
      // passengers so supplier pricing and passenger rules are preserved.
      infants: 0,
    },
  });
  const data = response.data?.data || response.data;
  const token =
    data?.availabilityToken ||
    data?.token ||
    getHeader(response.headers, ["x-availability-token"]);

  // Abid Air's live API does not reliably return an availability token, so
  // this can no longer be treated as a hard failure — only opt-in callers
  // that truly need the 5-minute token should fail without one.
  if (requireToken && !token) {
    const error = new Error("Availability token problem");
    error.status = 502;
    error.code = "ABID_AIR_TOKEN_MISSING";
    throw error;
  }

  return { ...data, token: token || undefined };
};

export const createBooking = async (payload, availabilityToken) => {
  const response = await request("post", "/bookings", {
    data: payload,
    ...(availabilityToken && {
      headers: { "X-Availability-Token": availabilityToken },
    }),
  });
  return response.data?.data;
};

export const listBookings = async (params = {}) => {
  const response = await request("get", "/bookings", { params });
  return response.data;
};

export const getBookingById = async (bookingId) => {
  const response = await request(
    "get",
    `/bookings/${encodeURIComponent(bookingId)}`,
  );
  return response.data?.data;
};

export const cancelBooking = async (bookingId) => {
  const response = await request(
    "post",
    `/bookings/${encodeURIComponent(bookingId)}/cancel`,
  );
  return response.data?.data;
};

export const toIsoDate = (value) => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const normalizedTitle = (passenger) => {
  const title = String(passenger.title || "").toUpperCase();
  if (passenger.type === "Child") return "CHD";
  if (passenger.type === "Infant") return "INF";
  return ["MR", "MRS", "MS"].includes(title) ? title : "MR";
};

export const formatAbidAirPassengers = (
  passengers,
  { isUmrah = false } = {},
) => {
  if (!Array.isArray(passengers) || passengers.length === 0) {
    const error = new Error("At least one passenger is required for Abid Air");
    error.status = 422;
    error.code = "ABID_AIR_PASSENGERS_REQUIRED";
    throw error;
  }

  return passengers.map((passenger, index) => {
    const mapped = {
      type: passenger.type,
      title: normalizedTitle(passenger),
      givenName: String(passenger.givenName || "").trim(),
      surName: String(passenger.surName || passenger.surname || "").trim(),
      passport: String(passenger.passport || passenger.passportNo || "").trim(),
      nationality: String(passenger.nationality || "").trim(),
      dateOfBirth: toIsoDate(passenger.dateOfBirth || passenger.dob),
      passportIssue: toIsoDate(passenger.passportIssue),
      passportExpiry: toIsoDate(
        passenger.passportExpiry || passenger.expiry || passenger.doe,
      ),
    };

    if (passenger.childType) mapped.childType = passenger.childType;
    if (isUmrah && mapped.type === "Child" && !mapped.childType) {
      mapped.childType = "withoutBed";
    }

    const required = [
      "type",
      "title",
      "givenName",
      "surName",
      "passport",
      "nationality",
    ];
    if (isUmrah) required.push("dateOfBirth", "passportExpiry");
    const missing = required.filter((field) => !mapped[field]);
    if ((passenger.dateOfBirth || passenger.dob) && !mapped.dateOfBirth) {
      missing.push("valid dateOfBirth");
    }
    if (passenger.passportIssue && !mapped.passportIssue) {
      missing.push("valid passportIssue");
    }
    if (
      (passenger.passportExpiry || passenger.expiry || passenger.doe) &&
      !mapped.passportExpiry
    ) {
      missing.push("valid passportExpiry");
    }
    if (!["Adult", "Child", "Infant"].includes(mapped.type))
      missing.push("valid type");
    if (
      isUmrah &&
      mapped.type === "Child" &&
      !["withBed", "withoutBed"].includes(mapped.childType)
    ) {
      missing.push("childType (withBed or withoutBed)");
    }
    if (missing.length) {
      const error = new Error(
        `Passenger ${index + 1} is missing or has invalid Abid Air fields: ${[...new Set(missing)].join(", ")}`,
      );
      error.status = 422;
      error.code = "ABID_AIR_PASSENGER_VALIDATION";
      error.fields = [...new Set(missing)];
      throw error;
    }

    return Object.fromEntries(
      Object.entries(mapped).filter(
        ([, value]) => value !== null && value !== "",
      ),
    );
  });
};

// Abid Air never sends an airline code/logo directly — but the flight number
// prefix IS the IATA code (e.g. "G9-563" -> "G9" for Air Arabia, "SV-739" ->
// "SV" for Saudia). Reusing that lets the existing wway.io logo-by-code
// fallback (see AllGroups.jsx getAirlineLogoUrl) render a real logo.
const extractAirlineCodeFromFlights = (flights) => {
  const flightNo = flights?.[0]?.flightNo || flights?.[0]?.flight_no || "";
  const match = String(flightNo).match(/^([A-Z0-9]{2,3})[-\s]/i);
  return match ? match[1].toUpperCase() : "";
};

const normalizeFlight = (flight, index = 0) => ({
  sr: Number(flight.sr) || index + 1,
  flight_no: flight.flightNo || flight.flight_no || "",
  dep_date: toIsoDate(
    flight.depDate || flight.flightDate || flight.flight_date,
  ),
  flight_date: toIsoDate(
    flight.depDate || flight.flightDate || flight.flight_date,
  ),
  dept_time: flight.depTime || flight.deptTime || flight.dept_time || "",
  origin:
    flight.origin ||
    flight.sectorFrom ||
    flight.fromTerminal ||
    flight.from ||
    "",
  destination:
    flight.destination ||
    flight.sectorTo ||
    flight.toTerminal ||
    flight.to ||
    "",
  arv_date: toIsoDate(flight.arrDate || flight.arrivalDate || flight.arv_date),
  arv_time: flight.arrTime || flight.arrivalTime || flight.arv_time || "",
  baggage: flight.baggage || "",
  meal: flight.meal || "",
  bookedSeats: 0,
});

export const normalizeAbidAirGroup = (group) => ({
  id: String(group.id),
  externalId: String(group.id),
  groupCode: group.groupCode || "",
  name: group.name || "",
  source: ABID_AIR_SOURCE,
  isOwnGroup: false,
  supplier: { name: ABID_AIR_SUPPLIER_NAME },
  supplierName: ABID_AIR_SUPPLIER_NAME,
  sector: group.sector || "",
  sectorKey: group.sector || "",
  type: group.type || "",
  available_no_of_pax: Number(group.availableSeats) || 0,
  showSeat: true,
  _totalOriginalSeats: Number(group.availableSeats) || 0,
  _onHoldSeats: 0,
  _activeBookings: 0,
  price: Number(group.fares?.adult) || 0,
  childPrice: Number(group.fares?.child) || 0,
  infantPrice: Number(group.fares?.infant) || 0,
  currency: group.currency || "PKR",
  fares: group.fares || {},
  pnr: group.pnr || "",
  dept_date: toIsoDate(
    group.flights?.[0]?.depDate || group.flights?.[0]?.flightDate,
  ),
  arv_date: toIsoDate(
    group.flights?.[group.flights.length - 1]?.arrDate ||
      group.flights?.[group.flights.length - 1]?.arrivalDate,
  ),
  details: (group.flights || []).map(normalizeFlight),
  flights: group.flights || [],
  airline: {
    id: null,
    airline_name:
      (typeof group.airline === "string"
        ? group.airline
        : group.airline?.name) || "",
    short_name:
      (typeof group.airline === "object" &&
        (group.airline.shortName || group.airline.code)) ||
      extractAirlineCodeFromFlights(group.flights) ||
      "",
    logo_url:
      typeof group.airline === "object" ? group.airline.logo || null : null,
  },
  user: null,
  bookedSeats: 0,
  supplierMetadata: { groupCode: group.groupCode || null },
});

export const normalizeAbidAirPackage = (pkg) => {
  const totals = pkg.packageTotals || {};
  return {
    ...pkg,
    id: String(pkg.id),
    externalId: String(pkg.id),
    packageName: pkg.name || pkg.packageName || `Umrah Package ${pkg.id}`,
    packageSource: ABID_AIR_SOURCE,
    source: ABID_AIR_SOURCE,
    supplier: { name: ABID_AIR_SUPPLIER_NAME },
    supplierName: ABID_AIR_SUPPLIER_NAME,
    days: Number(pkg.days) || 0,
    availableRooms: Number(pkg.availableRooms) || 0,
    internalStatus: "Public",
    packageTotals: {
      double: Number(totals.double) || 0,
      triple: Number(totals.triple) || 0,
      quad: Number(totals.quad) || 0,
      shared: Number(totals.shared ?? totals.sharing) || 0,
      childWithBed: Number(totals.childWithBed) || 0,
      childWithoutBed: Number(totals.childWithoutBed) || 0,
      infant: Number(totals.infant) || 0,
      incentive: Number(totals.incentive) || 0,
    },
    rooms: pkg.rooms || {},
    flights: pkg.flights || [],
    hotels: pkg.hotels || [],
    transports: pkg.transports || [],
    visa: pkg.visa || null,
    visibility: true,
  };
};

export const getAbidAirHttpStatus = (error) => {
  // 401/403 mean OUR Abid Air key/scope is wrong, not that the agent is
  // logged out — never surface them as auth errors to the agent (the code
  // is kept for diagnostics).
  if ([400, 404, 409, 422, 429].includes(error?.status)) return error.status;
  if ([401, 403].includes(error?.status)) return 502;
  if (error?.status >= 500) return 502;
  return error?.status || 500;
};
