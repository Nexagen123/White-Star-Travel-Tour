import {
  checkAvailability,
  getGroupTicketingById,
  getUmrahPackageById,
} from "../utils/Abid-Air.js";

// Abid Air doesn't consistently expose a remaining-seat number under one
// fixed key across group-ticketing and Umrah-package responses, so every
// known alias is checked before giving up.
const REMAINING_SEAT_KEYS = [
  "remaining_seats",
  "remain_seats",
  "remainingSeats",
  "available_no_of_pax",
  "availableUnits",
  "available_units",
  "available_seats",
  "availableSeats",
  "seats_available",
  "availableRooms",
];

const findRemainingSeats = (value, visited = new Set()) => {
  if (!value || typeof value !== "object" || visited.has(value)) return null;
  visited.add(value);

  for (const key of REMAINING_SEAT_KEYS) {
    const seats = Number(value[key]);
    if (Number.isFinite(seats)) return seats;
  }

  for (const nestedValue of Object.values(value)) {
    const seats = findRemainingSeats(nestedValue, visited);
    if (seats !== null) return seats;
  }

  return null;
};

/**
 * Confirms live seats with Abid Air's POST /availability (which also throws
 * a structured 409 when inventory has run out — the primary availability
 * signal), then best-effort enriches the result with a remaining-seat count
 * from the availability response or a fresh inventory lookup.
 */
const getAbidAirAvailability = async (
  inventoryId,
  passengerCounts,
  { isPackage = false } = {},
) => {
  const adults = Number(passengerCounts?.adults) || 0;
  const children = Number(passengerCounts?.children) || 0;

  const availability = await checkAvailability({
    inventoryId,
    adults,
    children,
    requireToken: false,
  });

  let inventory = null;
  try {
    inventory = isPackage
      ? await getUmrahPackageById(inventoryId)
      : await getGroupTicketingById(inventoryId);
  } catch (error) {
    // Availability is the source of truth here — the inventory lookup is
    // only used to enrich the response with a seat count when possible.
    console.error(
      "ABID AIR INVENTORY LOOKUP AFTER AVAILABILITY ERROR:",
      error.message || error,
    );
  }

  const remainingSeats =
    findRemainingSeats(availability) ?? findRemainingSeats(inventory);

  return { remainingSeats, response: inventory || availability };
};

const checkAbidAirAvailability = async (
  req,
  res,
  { isPackage, inventoryId },
) => {
  try {
    const hasPassengerCounts = ["adults", "children", "infants"].some(
      (key) => req.query[key] !== undefined,
    );
    const counts = hasPassengerCounts
      ? {
          adults: Number(req.query.adults),
          children: Number(req.query.children),
          infants: Number(req.query.infants),
        }
      : { adults: Number(req.query.requiredSeats), children: 0, infants: 0 };

    if (
      Object.values(counts).some(
        (value) => !Number.isInteger(value) || value < 0,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "adults, children, and infants must be non-negative whole numbers.",
      });
    }

    // Infants travel on a lap and don't occupy a seat/room slot, so they're
    // excluded from the seat count checked against Abid Air's inventory.
    const requiredSeats = counts.adults + counts.children;

    const { remainingSeats } = await getAbidAirAvailability(
      inventoryId,
      counts,
      { isPackage },
    );
    const hasSeatCount = remainingSeats !== null && remainingSeats !== undefined;
    const available = hasSeatCount ? requiredSeats <= remainingSeats : true;

    return res.status(available ? 200 : 409).json({
      success: available,
      available,
      requiredSeats,
      ...(hasSeatCount && { remainingSeats }),
      message: available
        ? "Seats are available."
        : `Seats not available. You requested ${requiredSeats} seat(s), but only ${remainingSeats} remain.`,
    });
  } catch (error) {
    console.error("ABID AIR AVAILABILITY ERROR:", error.message || error);
    const message =
      error.responseData?.error?.message ||
      error.message ||
      "Unable to check seat availability.";

    const status =
      Number.isInteger(error.status) && error.status >= 400 && error.status < 500
        ? error.status
        : 400;

    return res.status(status).json({
      success: false,
      message,
    });
  }
};

export const checkAbidAirFlightAvailability = async (req, res) =>
  checkAbidAirAvailability(req, res, {
    isPackage: false,
    inventoryId: req.params.groupId,
  });

export const checkAbidAirPackageAvailability = async (req, res) =>
  checkAbidAirAvailability(req, res, {
    isPackage: true,
    inventoryId: req.params.packageId,
  });
