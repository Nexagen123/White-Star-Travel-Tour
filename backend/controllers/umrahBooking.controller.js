import Payment from "../models/Payment.js";
import Register from "../models/Register.js";
import UmrahPackageBooking from "../models/UmrahPackageBooking.js";
import zipAccountsService from "../services/zipAccounts.service.js";
import GroupTicketing from "../models/umrahPackgemodel.js";
import GroupTicket from "../models/GroupTicketing.js";
import { calculateBookingExpiresAt } from "../utils/bookingHoldDuration.js";
import {
  restockUmrahPackageRooms,
  reserveUmrahPackageRooms,
} from "../utils/umrahPackageInventory.js";
import { bookUmrahTNT, getTNTUser } from "../utils/Travel-Network.js";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import BookingCounter from "../models/BookingCounter.js";
import ActivityLog from "../models/activitylogs.js";
import TravelNetworkMargin from "../models/TravelNetworkMargin.js";
import {
  ABID_AIR_SUPPLIER_NAME,
  cancelBooking as cancelAbidAirBooking,
  checkAvailability as checkAbidAirAvailability,
  createBooking as createAbidAirBooking,
  formatAbidAirPassengers,
  getAbidAirHttpStatus,
  getUmrahPackageById as getAbidAirPackageById,
} from "../utils/Abid-Air.js";

/* ===========================
   HELPER: Parse FormData fields with bracket notation
   Example: "pricing[pricePerPerson]" -> { pricing: { pricePerPerson: value }}
=========================== */
const parseFormData = (body) => {
  const parsed = {};

  for (const [key, value] of Object.entries(body)) {
    // Handle bracket notation like pricing[pricePerPerson]
    const match = key.match(/^(.+?)\[(.+?)\]$/);

    if (match) {
      const [, parentKey, childKey] = match;
      if (!parsed[parentKey]) parsed[parentKey] = {};
      parsed[parentKey][childKey] = value;
    } else {
      parsed[key] = value;
    }
  }

  return parsed;
};

/* ===========================
   HELPER: Parse passengers array from FormData
   Example: passengers[0][type] -> [{ type: value, ... }]
=========================== */
const parsePassengers = (body) => {
  // If multer/qs already parsed passengers into an array of objects, use it directly
  if (
    Array.isArray(body.passengers) &&
    body.passengers.length > 0 &&
    typeof body.passengers[0] === "object"
  ) {
    return body.passengers;
  }

  // If it's a JSON string, parse it
  if (typeof body.passengers === "string") {
    try {
      const parsed = JSON.parse(body.passengers);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
  }

  // Fallback: parse bracket notation keys manually (e.g. passengers[0][type])
  const passengersMap = {};
  for (const [key, value] of Object.entries(body)) {
    const match = key.match(/^passengers\[(\d+)\]\[(.+)\]$/);
    if (match) {
      const [, index, field] = match;
      const idx = parseInt(index, 10);
      if (!passengersMap[idx]) passengersMap[idx] = {};
      passengersMap[idx][field] = value;
    }
  }

  return Object.keys(passengersMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((idx) => passengersMap[idx]);
};

/* ===========================
   CREATE UMRAH PACKAGE BOOKING
   
   - "local-db": Locally managed packages (stored in MongoDB)
   
   Status updates work with booking data only, not package lookups.
=========================== */
export const createUmrahBooking = async (req, res) => {
  try {
    const parsedData = parseFormData(req.body);
    const passengers = parsePassengers(req.body);

    // Validate passengers exist
    if (!passengers || passengers.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No passengers found in request. Please add at least one passenger.",
      });
    }

    // Parse packageData JSON if it exists
    let packageData = parsedData.packageData;
    if (typeof packageData === "string") {
      try {
        packageData = JSON.parse(packageData);
      } catch (e) {
        console.error("Error parsing packageData:", e);
      }
    }

    // Generate sequential booking number
    const umrahCounter = await BookingCounter.findOneAndUpdate(
      { date: "umrah-global" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    const bookingNumber = String(umrahCounter.seq).padStart(4, "0");

    // Get pricing from parsed data
    const pricing = parsedData.pricing || {};
    const totalPassengers = passengers?.length || 0;
    const adultCount = passengers.filter((p) => p.type === "Adult").length;
    const childCount = passengers.filter((p) => p.type === "Child").length;
    const infantCount = passengers.filter((p) => p.type === "Infant").length;

    const pricePerPerson = Number(pricing.pricePerPerson) || 0;
    const adultTotal =
      Number(pricing.adultTotal) || pricePerPerson * adultCount;
    const childTotal =
      Number(pricing.childTotal) || Number(pricing.childTotal) || 0;
    const infantTotal =
      Number(pricing.infantTotal) || Number(pricing.infantTotal) || 0;

    const incentive = packageData?.packageTotals?.incentive || 0;

    const calculatedTotal =
      Number(pricing.totalAmount) ||
      adultTotal + childTotal + infantTotal ||
      pricePerPerson * totalPassengers ||
      0;

    // incentive is per-pax — multiply by total passengers before deducting
    const totalPrice = calculatedTotal - incentive * totalPassengers;

    // Handle passport files — matched by index via field name passportFile_0, passportFile_1, etc.
    const uploadedFiles = req.files || [];
    const fileByIndex = {};
    uploadedFiles.forEach((f) => {
      const match = f.fieldname.match(/^passportFile_(\d+)$/);
      if (match) fileByIndex[parseInt(match[1], 10)] = f.path;
    });

    const passengersWithFiles = passengers.map((passenger, index) => ({
      ...passenger,
      documentUrl: fileByIndex[index] || null,
    }));

    const bookingSource = parsedData.packageSource || "local-db";
    const expiresAt = await calculateBookingExpiresAt(
      new Date(),
      bookingSource,
    );

    let abidAirHandoff = null;
    if (bookingSource === "abid-air") {
      const inventoryId = String(parsedData.packageId);
      await getAbidAirPackageById(inventoryId);
      const mappedPassengers = formatAbidAirPassengers(passengers, {
        isUmrah: true,
      });
      const availability = await checkAbidAirAvailability({
        inventoryId,
        adults: adultCount,
        children: childCount,
      });
      const bookingUser = await Register.findById(parsedData.user).select(
        "name",
      );
      const firstPassengerName =
        `${mappedPassengers[0]?.givenName || ""} ${mappedPassengers[0]?.surName || ""}`.trim();
      abidAirHandoff = {
        availabilityToken: availability.token,
        passengers: mappedPassengers,
        contactPersonName:
          parsedData.contactPersonName ||
          bookingUser?.name ||
          firstPassengerName,
      };
    }

    const bookingData = {
      packageId: parsedData.packageId,
      packageName: parsedData.packageName,
      packageSource: parsedData.packageSource || "local-db",
      user: parsedData.user,
      roomType: parsedData.roomType,
      specialRequests: parsedData.specialRequests,
      passengers: passengersWithFiles,
      packageData: packageData,
      bookingNumber,
      pricing: {
        pricePerPerson,
        adultTotal,
        childTotal,
        infantTotal,
        currency: pricing.currency || "PKR",
        totalPrice: parseFloat(totalPrice),
      },
      paymentStatus: {
        status: "Pending",
        totalAmount: parseFloat(totalPrice),
        paidAmount: 0,
        remainingAmount: parseFloat(totalPrice),
        paymentHistory: [],
      },
      overallStatus: "On Hold",
      expiresAt,
      supplierName: bookingSource === "abid-air" ? ABID_AIR_SUPPLIER_NAME : "",
      supplierBookingStatus: bookingSource === "abid-air" ? "pending" : null,
    };

    // console.log(
    //   "Creating booking with data:",
    //   JSON.stringify(bookingData, null, 2),
    // );

    const booking = await UmrahPackageBooking.create(bookingData);

    // Reserve rooms for local packages on booking creation
    if (bookingSource === "local-db") {
      try {
        await reserveUmrahPackageRooms(booking);
      } catch (err) {
        await UmrahPackageBooking.findByIdAndDelete(booking._id);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
    }

    // Hit Travel Network booking API if package source is travel-network
    if (parsedData.packageSource === "travel-network" && packageData) {
      try {
        const bookingUser = await Register.findById(parsedData.user).select(
          "name email phone companyName",
        );

        const tntUser = await getTNTUser();

        // ─── Strip our margin before this goes anywhere near TNT ───────────
        // packageData.umrah_package_price_plan (built on the frontend) is
        // priced off packageData.packageTotals, which has OUR margin baked
        // in (that's the correct, with-margin price for the local DB
        // booking / customer). TNT must only ever see the net price we
        // actually owe them, so recompute the plan here from
        // originalPackageTotals (margin-free) rather than trusting whatever
        // the client sent.
        const marginRecord = await TravelNetworkMargin.findOne({
          type: "umrah",
          source: "travel-network",
        });
        // Can be negative — a negative margin is a discount off the base price.
        const marginPerPax = Number(marginRecord?.marginAmount) || 0;

        const roomTypeKeyMap = {
          double: "double",
          triple: "triple",
          quad: "quad",
          sharing: "shared",
          shared: "shared",
        };
        const roomKey =
          roomTypeKeyMap[parsedData.roomType] || parsedData.roomType;

        const displayTotals = packageData.packageTotals || {}; // with margin
        const originalTotals = packageData.originalPackageTotals || {}; // without margin
        const suppliedPlan = packageData.umrah_package_price_plan || {};

        const adultDisplay =
          Number(displayTotals[roomKey]) ||
          Number(suppliedPlan.adult) ||
          pricePerPerson ||
          0;
        const childDisplay =
          Number(displayTotals.childWithoutBed) ||
          Number(suppliedPlan.child) ||
          0;
        const infantDisplay =
          Number(displayTotals.infant) || Number(suppliedPlan.infant) || 0;

        const adultNet =
          Number(originalTotals[roomKey]) ||
          Math.max(0, adultDisplay - marginPerPax);
        const childNet =
          Number(originalTotals.childWithoutBed) ||
          Math.max(0, childDisplay - marginPerPax);
        // Infant pricing usually carries no margin
        const infantNet = Number(originalTotals.infant) || infantDisplay;

        const netPricePlan = {
          ...suppliedPlan,
          adult: adultNet,
          child: childNet,
          infant: infantNet,
        };

        const tntPayload = {
          group_id:
            packageData.tnt_group_id ??
            packageData.group_id ??
            packageData.groupId ??
            null,
          package_id:
            packageData.tnt_package_id ?? packageData.package_id ?? null,
          agency_info: {
            agency_name: bookingUser?.companyName || "",
            agent_name: bookingUser?.name || "",
            created_by_id:
              tntUser?.id ?? Number(process.env.TNT_CREATED_BY_ID) ?? null,
            email: bookingUser?.email || "",
            mobile: bookingUser?.phone || "",
            adults: passengers.filter((p) => p.type === "Adult").length,
            child: passengers.filter((p) => p.type === "Child").length,
            infant: passengers.filter((p) => p.type === "Infant").length,
            agent_notes: parsedData.specialRequests || "",
          },
          booking_details: passengers.map((p) => {
            // Map title to TNT expected format
            let title = p.title;

            if (p.type === "Adult") {
              // Adults should be MR, MRS, or MS
              const adultTitle = p.title?.toUpperCase() || "MR";
              title = ["MR", "MRS", "MS"].includes(adultTitle)
                ? adultTitle
                : "MR";
            } else if (p.type === "Child") {
              title = "CHD";
            } else if (p.type === "Infant") {
              // TNT expects "INF" for infants
              title = "INF";
            }

            return {
              type: p.type, // Keep original type: Adult, Child, Infant
              title: title,
              surname: p.surName,
              given_name: p.givenName,
              passport_no: p.passport,
              dob: p.dateOfBirth
                ? new Date(p.dateOfBirth).toISOString().split("T")[0]
                : p.dob,
              doe: p.passportExpiry
                ? new Date(p.passportExpiry).toISOString().split("T")[0]
                : p.doe,
            };
          }),
          umrah_package_price_plan: netPricePlan,
        };

        const tntResponse = await bookUmrahTNT(tntPayload);

        booking.travelNetworkBookingId =
          tntResponse?.data?.id?.toString() ||
          tntResponse?.id?.toString() ||
          null;
        booking.travelNetworkBookingRefNo =
          tntResponse?.data?.reference_no || tntResponse?.reference_no || null;
        booking.travelNetworkBookingData = tntResponse;
        booking.travelNetworkBookingCreatedAt = new Date();
        await booking.save();
      } catch (err) {
        // TNT booking failed — delete our local booking and return error
        await UmrahPackageBooking.findByIdAndDelete(booking._id);
        return res.status(400).json({
          success: false,
          message: `Travel Network booking failed: ${err.message}`,
        });
      }
    }

    if (bookingSource === "abid-air") {
      try {
        const supplierResponse = await createAbidAirBooking(
          {
            inventoryId: String(parsedData.packageId),
            contactPersonName: abidAirHandoff.contactPersonName,
            roomType: parsedData.roomType,
            passengers: abidAirHandoff.passengers,
          },
          abidAirHandoff.availabilityToken,
        );

        if (!supplierResponse?._id) {
          const invalidResponseError = new Error(
            "Abid Air booking response did not include a booking ID",
          );
          invalidResponseError.status = 502;
          invalidResponseError.code = "ABID_AIR_BOOKING_ID_MISSING";
          throw invalidResponseError;
        }

        // Abid Air prices its own inventory — we only ever charge the
        // customer their net price plus our margin on top (mirrors how the
        // Travel Network margin works), so account for that margin before
        // flagging a mismatch between what we charged and what they billed.
        const abidMarginRecord = await TravelNetworkMargin.findOne({
          type: "umrah",
          source: "abid-air",
        });
        // Can be negative — a negative margin is a discount off the base price.
        const abidMarginPerPax = Number(abidMarginRecord?.marginAmount) || 0;
        const expectedCustomerTotal =
          Number(supplierResponse.pricing?.totalPrice) +
          abidMarginPerPax * (adultCount + childCount);

        const supplierTotal = Number(supplierResponse.pricing?.totalPrice);
        booking.supplierBookingId = String(supplierResponse._id);
        booking.supplierBookingStatus = supplierResponse.status || "On Hold";
        booking.supplierBookingData = supplierResponse;
        booking.supplierBookingCreatedAt = new Date();
        booking.supplierPricing = supplierResponse.pricing || null;
        booking.supplierPriceMismatch =
          Number.isFinite(expectedCustomerTotal) &&
          Math.abs(expectedCustomerTotal - Number(totalPrice)) > 0.01;
        booking.supplierError = null;
        if (supplierResponse.expiresAt) {
          booking.expiresAt = new Date(supplierResponse.expiresAt);
        }
        await booking.save();
      } catch (abidAirError) {
        const uncertainOutcome =
          abidAirError.status === 429 || abidAirError.status >= 500;
        if (uncertainOutcome) {
          booking.supplierBookingStatus = "supplier_pending";
          booking.supplierError = {
            status: abidAirError.status,
            code: abidAirError.code,
            message: abidAirError.message,
            retryAfter: abidAirError.retryAfter || null,
            requestId: abidAirError.requestId || null,
            correlationId: abidAirError.correlationId || null,
          };
          await booking.save();
        } else {
          await UmrahPackageBooking.findByIdAndDelete(booking._id);
        }

        return res.status(getAbidAirHttpStatus(abidAirError)).json({
          success: false,
          message: `Abid Air booking handoff failed: ${abidAirError.message}`,
          code: abidAirError.code,
          retryAfter: abidAirError.retryAfter || undefined,
          requestId: abidAirError.requestId || undefined,
          correlationId: abidAirError.correlationId || undefined,
          reconciliationRequired: uncertainOutcome,
          data: uncertainOutcome ? booking : undefined,
        });
      }
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Umrah booking "${booking.bookingNumber}" created for ${booking.passengers?.length || 0} passenger(s) - ${booking.packageName}`,
    });

    res.status(201).json({
      success: true,
      message: "Umrah package booking created successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Create Umrah Booking Error:", error.message);
    const isAbidAirError = req.body.packageSource === "abid-air";
    res.status(isAbidAirError ? getAbidAirHttpStatus(error) : 400).json({
      success: false,
      message: error.message,
      code: isAbidAirError ? error.code : undefined,
      retryAfter: isAbidAirError ? error.retryAfter || undefined : undefined,
      requestId: isAbidAirError ? error.requestId || undefined : undefined,
      correlationId: isAbidAirError
        ? error.correlationId || undefined
        : undefined,
    });
  }
};

/* ===========================
   GET ALL UMRAH BOOKINGS
=========================== */
export const getAllUmrahBookings = async (req, res) => {
  try {
    const { status, user, packageId } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.overallStatus = status;
    if (user) filter.user = user;
    if (packageId) filter.packageId = packageId;

    const bookings = await UmrahPackageBooking.find(filter)
      .populate(
        "user",
        "name email phone role companyName agencyCode consultant",
      )
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Get All Umrah Bookings Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET MY BOOKINGS (USER)
=========================== */
export const getMyBookings = async (req, res) => {
  try {
    // First, get all bookings with user populated
    const bookings = await UmrahPackageBooking.find({
      user: req.user._id.toString(),
    })
      .populate(
        "user",
        "name email phone role companyName agencyCode consultant",
      )
      .lean() // Use lean for better performance
      .sort({ createdAt: -1 });

    // Separate local-db and travel-network bookings
    const localDbBookings = bookings.filter(
      (b) => b.packageSource === "local-db",
    );
    const travelNetworkBookings = bookings.filter(
      (b) => b.packageSource === "travel-network",
    );

    // Get package IDs from local-db bookings
    const localPackageIds = localDbBookings
      .map((b) => b.packageId)
      .filter((id) => id); // Remove null/undefined

    // Fetch all local packages in one query
    let localPackages = [];
    if (localPackageIds.length > 0) {
      localPackages = await GroupTicketing.find({
        _id: { $in: localPackageIds },
      })
        .select(
          "packageName packageTotals flights hotels transports visa rooms days availableRooms selectedGroupTicketId",
        )
        .lean();
    }

    // Create a map for quick lookup
    const packageMap = {};
    localPackages.forEach((pkg) => {
      packageMap[pkg._id.toString()] = pkg;
    });

    // Process all bookings
    const processedBookings = bookings.map((booking) => {
      if (booking.packageSource === "local-db") {
        // Replace packageId with populated data if found
        const packageId = booking.packageId?.toString();
        if (packageId && packageMap[packageId]) {
          booking.packageId = packageMap[packageId];
        } else {
          // If not found, keep as is or set to null
          booking.packageId = booking.packageId;
        }
      } else if (booking.packageSource === "travel-network") {
        // Keep the packageId as is for external packages
        booking.isExternalPackage = true;
        booking.externalSource = "travel-network";
      } else if (booking.packageSource === "abid-air") {
        booking.isExternalPackage = true;
        booking.externalSource = "abid-air";
      }

      return booking;
    });

    res.status(200).json({
      success: true,
      count: processedBookings.length,
      data: processedBookings,
    });
  } catch (error) {
    console.error("Get My Bookings Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET ALL BOOKINGS (ADMIN ONLY)
=========================== */
export const getAllBookingsAdmin = async (req, res) => {
  try {
    const { status, user, packageId, search } = req.query;
    // Build filter
    const filter = {};
    if (status) filter.overallStatus = status;
    if (user) filter.user = user;
    if (packageId) filter.packageId = packageId;
    if (search) {
      filter.$or = [
        { bookingNumber: { $regex: search, $options: "i" } },
        { packageName: { $regex: search, $options: "i" } },
      ];
    }

    // Get all bookings with user populated first
    let bookings = await UmrahPackageBooking.find(filter)
      .populate(
        "user",
        "name email phone role companyName agencyCode consultant",
      )
      .lean() // Use lean for better performance
      .sort({ createdAt: -1 });

    // Separate local-db and travel-network bookings
    const localDbBookings = bookings.filter(
      (b) => b.packageSource === "local-db",
    );
    const travelNetworkBookings = bookings.filter(
      (b) => b.packageSource === "travel-network",
    );

    // Get package IDs from local-db bookings
    const localPackageIds = localDbBookings
      .map((b) => b.packageId)
      .filter((id) => id); // Remove null/undefined

    // Fetch all local packages in one query
    let localPackages = [];
    if (localPackageIds.length > 0) {
      localPackages = await GroupTicketing.find({
        _id: { $in: localPackageIds },
      })
        .select(
          "packageName packageTotals flights hotels transports visa rooms days availableRooms selectedGroupTicketId",
        )
        .lean();
    }

    // Create a map for quick lookup
    const packageMap = {};
    localPackages.forEach((pkg) => {
      packageMap[pkg._id.toString()] = pkg;
    });

    // Process all bookings
    const processedBookings = bookings.map((booking) => {
      if (booking.packageSource === "local-db") {
        // Replace packageId with populated data if found
        const packageId = booking.packageId?.toString();
        if (packageId && packageMap[packageId]) {
          booking.packageId = packageMap[packageId];
        } else {
          // If not found, keep as is or set to null
          booking.packageId = booking.packageId;
        }
      } else if (booking.packageSource === "travel-network") {
        // Keep the packageId as is for external packages
        booking.isExternalPackage = true;
        booking.externalSource = "travel-network";
        // Optionally, you could add a note that this package comes from external source
        booking._externalPackageNote =
          "This package is from travel network. Please fetch details from external API.";
      } else if (booking.packageSource === "abid-air") {
        booking.isExternalPackage = true;
        booking.externalSource = "abid-air";
        booking._externalPackageNote =
          "This package is from Abid Air International. Stored supplier details are attached.";
      }

      return booking;
    });

    res.status(200).json({
      success: true,
      count: processedBookings.length,
      data: processedBookings,
    });
  } catch (error) {
    console.error("Get All Bookings Admin Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET SINGLE UMRAH BOOKING BY ID
=========================== */
export const getUmrahBookingById = async (req, res) => {
  try {
    console.log("hit");
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Get Umrah Booking Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE UMRAH BOOKING
=========================== */
export const updateUmrahBooking = async (req, res) => {
  try {
    // If updating passengers, recalculate total price
    if (req.body.passengers || req.body.pricing?.pricePerPerson) {
      const booking = await UmrahPackageBooking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Umrah booking not found",
        });
      }

      const passengers = req.body.passengers || booking.passengers;
      const pricePerPerson =
        req.body.pricing?.pricePerPerson || booking.pricing.pricePerPerson;
      const totalPrice = pricePerPerson * passengers.length;

      req.body.pricing = {
        ...booking.pricing,
        ...req.body.pricing,
        totalPrice,
      };

      // Update payment status total amount if needed
      if (req.body.paymentStatus) {
        req.body.paymentStatus.totalAmount = totalPrice;
      } else {
        req.body.paymentStatus = {
          ...booking.paymentStatus,
          totalAmount: totalPrice,
        };
      }
    }

    const booking = await UmrahPackageBooking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Umrah booking "${booking.bookingNumber}" updated`,
    });

    res.status(200).json({
      success: true,
      message: "Umrah booking updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Umrah Booking Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   DELETE UMRAH BOOKING
=========================== */
export const deleteUmrahBooking = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      description: `Umrah booking "${booking.bookingNumber}" deleted`,
    });

    res.status(200).json({
      success: true,
      message: "Umrah booking deleted successfully",
    });
  } catch (error) {
    console.error("Delete Umrah Booking Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   SUBMIT PAYMENT (AGENT/USER)
   Agent/User submits payment - MUST be full amount
=========================== */
export const submitPayment = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    // Verify user owns this booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only submit payments for your own bookings",
      });
    }

    if (booking.overallStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "This booking is cancelled and cannot accept payments",
      });
    }

    if (
      ["On Hold", "Pending"].includes(booking.overallStatus) &&
      booking.expiresAt &&
      booking.expiresAt <= new Date()
    ) {
      booking.overallStatus = "Cancelled";
      booking.expiresAt = null;
      await restockUmrahPackageRooms(booking);
      await booking.save();

      return res.status(400).json({
        success: false,
        message: "This booking hold has expired",
      });
    }

    // Allow multiple payments - only check if there's a pending payment
    const hasPendingPayment = booking.paymentStatus.paymentHistory?.some(
      (payment) => payment.paymentStatus === "Pending",
    );

    if (hasPendingPayment) {
      return res.status(400).json({
        success: false,
        message:
          "Please wait for current payment to be reviewed before submitting another",
      });
    }

    const { amount, method, receiptNumber, notes, bankAccountId } = req.body;

    if (!amount || !method) {
      return res.status(400).json({
        success: false,
        message: "Amount and payment method are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Receipt file is required",
      });
    }

    const submittedAmount = parseFloat(amount);
    const remainingAmount = booking.paymentStatus.remainingAmount;

    // Allow partial or full payments (up to remaining amount)
    if (submittedAmount > remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount cannot exceed remaining amount of PKR ${remainingAmount.toLocaleString()}`,
      });
    }

    if (submittedAmount < 1) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be at least PKR 1",
      });
    }

    // Create new payment history item
    const newPayment = {
      amount: submittedAmount,
      method: method,
      paymentDate: new Date(),
      receiptNumber: receiptNumber || "",
      receiptFile: req.file.path, // Cloudinary URL
      notes: notes || "",
      paymentStatus: "Pending", // Admin needs to review
      submittedBy: req.user._id.toString(),
      bank: bankAccountId,
    };

    // Add to payment history
    if (!booking.paymentStatus.paymentHistory) {
      booking.paymentStatus.paymentHistory = [];
    }
    booking.paymentStatus.paymentHistory.push(newPayment);

    // Update overall payment status to Pending
    booking.paymentStatus.status = "Pending";

    await booking.save();

    // Now create a payment voucher entry for ledger hitting
    // Now create a payment voucher entry for ledger hitting
    const paymentVoucher = await Payment.create({
      umrahPkgBooking: booking._id,
      booking: null,

      user: booking.user,

      amount: submittedAmount,

      status: "Un Posted",

      date: new Date(),

      description: `Payment for Umrah Package Booking: ${booking.bookingNumber} - ${booking.packageName}`,

      // Receipt
      receipt: req.file.path,
      receiptPublicId: req.file.filename || null,

      // Optional Fields
      remarks: notes || "",

      // Optional custom fields
      paymentMethod: method,
      referenceNumber: receiptNumber || "",

      // If bank account exists
      bankAccount: booking.bankAccount || null,
    });

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Payment of ${submittedAmount} submitted for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: "Payment submitted successfully. Waiting for admin review.",
      data: booking,
    });
  } catch (error) {
    console.error("Submit Payment Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   REVIEW PAYMENT (ADMIN ONLY)
   Admin reviews single payment and updates status
   
   NOTE: This function works with booking data only.
   No package lookup required - booking stores all needed info.
=========================== */
export const reviewPayment = async (req, res) => {
  try {
    const { paymentId } = req.params; // This is actually bookingId now
    const { paymentStatus, rejectionReason } = req.body;

    // Find booking by ID
    const booking = await UmrahPackageBooking.findById(paymentId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if payment has been submitted (check payment history)
    const pendingPayment = booking.paymentStatus.paymentHistory?.find(
      (payment) => payment.paymentStatus === "Pending",
    );

    if (!pendingPayment) {
      return res.status(400).json({
        success: false,
        message: "No pending payment found for this booking",
      });
    }

    // Validate status
    if (!["Pending", "Approved", "Rejected"].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    // Check rejection reason if status is Rejected
    if (paymentStatus === "Rejected" && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required when rejecting payment",
      });
    }

    // Update the pending payment in history
    pendingPayment.paymentStatus = paymentStatus;
    pendingPayment.reviewedBy = req.user._id.toString();
    pendingPayment.reviewedAt = new Date();

    if (paymentStatus === "Rejected") {
      pendingPayment.rejectionReason = rejectionReason;
      // Reset overall status back to On Hold if payment rejected
      booking.overallStatus = "On Hold";
      const bookingSource = booking.packageSource || "local-db";
      booking.expiresAt = await calculateBookingExpiresAt(
        new Date(),
        bookingSource,
      );
      booking.paymentStatus.status = "Pending";
    }

    // If approved, add proof file and update overall status
    if (paymentStatus === "Approved") {
      if (req.file) {
        pendingPayment.approvalProofFile = req.file.path; // Cloudinary URL
      }

      // Update paid amount and remaining amount
      booking.paymentStatus.paidAmount += pendingPayment.amount;
      booking.paymentStatus.remainingAmount =
        booking.paymentStatus.totalAmount - booking.paymentStatus.paidAmount;

      // Update overall payment status to Approved (always, even if partial)
      booking.paymentStatus.status = "Approved";

      // Update overall booking status to In Progress when payment approved
      if (["On Hold", "Pending"].includes(booking.overallStatus)) {
        booking.overallStatus = "In Progress";
      }

      booking.expiresAt = null;

      // update the payment voucher with status posted
      await Payment.updateOne(
        { umrahPkgBooking: booking._id, status: "Un Posted" },
        { status: "Posted" },
      );

      // =========================
      // ZIP ACCOUNT LEDGER ENTRY
      // =========================

      // Get user
      const user = await Register.findById(booking.user);

      if (!user?.zipId) {
        throw new Error("User ZIP account ID not found");
      }

      // Get bank ID from payment history item
      const bankAccountId = pendingPayment.bank;

      if (!bankAccountId) {
        throw new Error("Bank account not found in payment");
      }

      const customerAccountId = user.zipId;

      const amount = pendingPayment.amount;

      const date = new Date().toISOString().split("T")[0];

      const description = `Umrah Payment - ${booking.bookingNumber} - ${booking.packageName}`;

      const rows = [
        // BANK DEBIT
        {
          account: bankAccountId,
          debit: amount,
          credit: 0,
          description,
        },

        // CUSTOMER CREDIT
        {
          account: customerAccountId,
          debit: 0,
          credit: amount,
          description,
        },
      ];

      const voucherData = {
        type: "journalPortal",
        date,
        transactions: rows.map((txn, index) => ({
          metadata: { id: index },
          account: txn.account,
          description: txn.description,
          credit: txn.credit,
          debit: txn.debit,
        })),
      };

      // Create ZIP voucher
      const response = await zipAccountsService.createVoucher(voucherData);
    }

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Payment ${paymentStatus.toLowerCase()} for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: `Payment ${paymentStatus.toLowerCase()} successfully`,
      data: booking,
    });
  } catch (error) {
    console.error("Review Payment Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE VISA STATUS
   
   NOTE: This function works with booking data only.
   No package lookup required - booking stores all needed info.
   Visa can be updated anytime (no payment dependency).
=========================== */
export const updateVisaStatus = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    // No payment dependency - visa can be updated anytime

    const updateData = {
      ...booking.visaStatus,
      ...req.body,
    };

    // Add approval document if file uploaded
    if (req.file) {
      updateData.approvalDocument = req.file.path; // Cloudinary URL
    }

    booking.visaStatus = updateData;

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Visa status updated to "${booking.visaStatus?.status}" for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: "Visa status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Visa Status Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE HOTEL STATUS
=========================== */
/* ===========================
   UPDATE HOTEL STATUS
   
   NOTE: This function works with booking data only.
   No package lookup required - booking stores all needed info.
   Checks visa dependency before allowing hotel updates.
=========================== */
export const updateHotelStatus = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    // const linkedPackage = await GroupTicketing.findById(booking.packageId);

    // if (!linkedPackage) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Linked package not found",
    //   });
    // }

    // =========================================
    // VISA MUST BE APPROVED FIRST
    // =========================================

    if (booking.visaStatus.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Cannot update hotel status. Visa must be approved first.",
      });
    }

    // =========================================
    // UPDATE HOTEL STATUS
    // =========================================

    const updateData = {
      ...booking.hotelStatus,
      ...req.body,
    };

    if (req.file) {
      updateData.confirmationDocument = req.file.path;
    }

    booking.hotelStatus = updateData;

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Hotel status updated to "${booking.hotelStatus?.status}" for Umrah booking "${booking.bookingNumber}"`,
    });

    return res.status(200).json({
      success: true,
      message: "Hotel status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Hotel Status Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE VOUCHER STATUS
=========================== */
export const updateVoucherStatus = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    booking.voucherStatus = {
      ...booking.voucherStatus,
      ...req.body,
    };

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Voucher status updated for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: "Voucher status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Voucher Status Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   EXTEND UMRAH BOOKING HOLD
=========================== */
export const extendUmrahBookingHold = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id).populate(
      "user",
      "name email phone role companyName agencyCode consultant",
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    if (!["On Hold", "Pending"].includes(booking.overallStatus)) {
      return res.status(400).json({
        success: false,
        message: "Only on-hold Umrah bookings can be extended",
      });
    }

    const holdMinutes = Number(req.body.holdMinutes);
    if (!Number.isFinite(holdMinutes) || holdMinutes <= 0) {
      return res.status(400).json({
        success: false,
        message: "Hold duration must be greater than zero",
      });
    }

    booking.overallStatus = "On Hold";
    booking.expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Umrah booking "${booking.bookingNumber}" hold extended by ${holdMinutes} minute(s)`,
    });

    res.status(200).json({
      success: true,
      message: "Umrah booking hold updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Extend Umrah Booking Hold Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE OVERALL STATUS
   get linked package whose booking was made
   hit on zip accounts ledger entries (multiple entries for all pax)
   all hotel , visa , ticket , transport supplier are credited
   customer is debited
   umrah income is debited or credited
=========================== */
export const updateOverallStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    const oldStatus = booking.overallStatus;

    // =========================================
    // DETERMINE BOOKING SOURCE
    // =========================================
    const packageSource = booking.packageSource || "local-db";
    const isTravelNetwork = packageSource === "travel-network";
    const isAbidAir = packageSource === "abid-air";
    const isExternalPackage = isTravelNetwork || isAbidAir;

    // =========================================
    // GET LINKED PACKAGE (only for non-travel-network bookings)
    // =========================================
    const linkedPackage = isExternalPackage
      ? null
      : await GroupTicketing.findById(booking.packageId);

    if (!isExternalPackage && !linkedPackage) {
      return res.status(404).json({
        success: false,
        message: "Linked package not found",
      });
    }

    // Reopening a cancelled booking should reserve inventory before any new
    // ledger voucher is created.
    // if (oldStatus === "Cancelled" && status !== "Cancelled") {
    //   await reserveUmrahPackageRooms(booking);
    // }
    if (isAbidAir && oldStatus === "Cancelled" && status !== "Cancelled") {
      return res.status(409).json({
        success: false,
        message: "A cancelled Abid Air booking cannot be reopened locally",
      });
    }

    // =========================================
    // CREATE VOUCHER WHEN STATUS CHANGES TO "Confirmed"
    // =========================================
    if (oldStatus !== "Confirmed" && status === "Confirmed") {
      // =========================================
      // CUSTOMER ACCOUNT
      // =========================================
      const user = await Register.findById(booking.user);

      if (!user?.zipId) {
        throw new Error("User ZIP account ID not found");
      }

      const customerAccountId = user.zipId;

      // =========================================
      // FETCH ZIP ACCOUNTS
      // =========================================
      const accountsData = await zipAccountsService.getAllAccounts();
      const accounts = Array.isArray(accountsData)
        ? accountsData
        : accountsData.results || [];

      // =========================================
      // FIND UMRAH INCOME ACCOUNT
      // =========================================
      const umrahIncomeAcc = accounts.find(
        (acc) => acc.account_name === "Umrah Income",
      );

      if (!umrahIncomeAcc) {
        throw new Error('"Umrah Income" account not found');
      }

      const umrahIncomeAccountId = umrahIncomeAcc._id;

      // =========================================
      // TRAVEL NETWORK: SIMPLIFIED VOUCHER
      // Customer is DEBITED with their type-specific selling price (with margin)
      // Travel Network supplier is CREDITED with the original price (without margin)
      // Margin + any supplier discount → Umrah Income
      // =========================================
      if (isTravelNetwork) {
        const travelNetworkAcc = accounts.find(
          (acc) => acc.account_name === "Travel Network",
        );

        if (!travelNetworkAcc) {
          throw new Error(
            '"Travel Network" supplier account not found in ZIP Accounts',
          );
        }

        const travelNetworkAccountId = travelNetworkAcc._id;
        const supplierDiscount = Math.max(
          0,
          Number(req.body.supplierDiscount) || 0,
        );

        // Persist the supplier discount on the booking document
        booking.supplierDiscount = supplierDiscount;

        // Fetch the stored margin so we know how much we added on top of each price
        const marginRecord = await TravelNetworkMargin.findOne({
          type: "umrah",
          source: "travel-network",
        });
        // Can be negative — a negative margin is a discount off the base price.
        const marginPerPax = Number(marginRecord?.marginAmount) || 0;

        // ─── Resolve per-type SELLING prices (WITH margin, what customer pays) ─────
        // packageData.packageTotals stores the margin-applied prices (display prices)
        // packageData.originalPackageTotals stores TNT net prices (without our margin)
        const packageData = booking.packageData || {};
        const displayTotals = packageData.packageTotals || {}; // with margin
        const originalTotals = packageData.originalPackageTotals || {}; // without margin
        const roomType = booking.roomType || "sharing";

        // Map roomType → key in packageTotals
        const roomTypeKeyMap = {
          double: "double",
          triple: "triple",
          quad: "quad",
          sharing: "shared",
          shared: "shared",
        };
        const roomKey = roomTypeKeyMap[roomType] || roomType;

        // Selling prices per pax type (with margin) — used for CUSTOMER DEBIT
        const adultSellingPrice = Math.round(
          displayTotals[roomKey] || booking.pricing?.pricePerPerson || 0,
        );
        const childSellingPrice = Math.round(
          displayTotals.childWithoutBed ||
            displayTotals[roomKey] ||
            adultSellingPrice,
        );
        const infantSellingPrice = Math.round(displayTotals.infant || 0);

        // Original TNT net prices per pax type (without our margin) — used for SUPPLIER CREDIT
        const adultOriginalPrice = Math.round(
          originalTotals[roomKey] ||
            Math.max(0, adultSellingPrice - marginPerPax),
        );
        const childOriginalPrice = Math.round(
          originalTotals.childWithoutBed ||
            originalTotals[roomKey] ||
            Math.max(0, childSellingPrice - marginPerPax),
        );
        const infantOriginalPrice = Math.round(
          originalTotals.infant || infantSellingPrice,
        ); // infant usually has no margin

        const getSellingPrice = (type) => {
          if (type === "Child") return childSellingPrice;
          if (type === "Infant") return infantSellingPrice;
          return adultSellingPrice;
        };

        const getOriginalPrice = (type) => {
          if (type === "Child") return childOriginalPrice;
          if (type === "Infant") return infantOriginalPrice;
          return adultOriginalPrice;
        };

        const passengers = booking.passengers || [];
        const rows = [];
        let totalSellingPrice = 0; // what customer pays (with margin)
        let totalSupplierCost = 0; // what we owe Travel Network (without margin)

        // CUSTOMER DEBIT — ONE ROW PER PAX with correct type-specific price
        passengers.forEach((pax) => {
          const paxName =
            `${pax.title || ""} ${pax.givenName || ""} ${pax.surName || ""}`.trim();
          const description = `Umrah Package Booking, ${paxName} (${pax.type}) - ${booking.bookingNumber}`;

          const sellingPrice = getSellingPrice(pax.type);
          const discount = Math.max(0, Number(pax.discount) || 0);
          const debitAmount = Math.max(0, sellingPrice - discount);
          totalSellingPrice += debitAmount;

          rows.push({
            account: customerAccountId,
            debit: debitAmount,
            credit: 0,
            description,
          });

          // Supplier cost = original TNT price (without our margin)
          // Also subtract pax-level discount from supplier cost if applied
          const originalPrice = getOriginalPrice(pax.type);
          const supplierAmount = Math.max(0, originalPrice - discount);
          totalSupplierCost += supplierAmount;
        });

        // Apply the supplier-level discount (admin-entered) on top of the per-pax discounts
        // This reduces what we credit to Travel Network
        const finalSupplierCost = Math.max(
          0,
          totalSupplierCost - supplierDiscount,
        );

        // TRAVEL NETWORK SUPPLIER CREDIT (original TNT price — without our margin — minus supplier discount)
        if (finalSupplierCost > 0) {
          rows.push({
            account: travelNetworkAccountId,
            debit: 0,
            credit: finalSupplierCost,
            description: `Travel Network Expense - ${booking.bookingNumber}`,
          });
        }

        // PROFIT ENTRY = our margin + supplier discount (total we keep)
        const profitOrLoss = totalSellingPrice - finalSupplierCost;

        if (profitOrLoss > 0) {
          rows.push({
            account: umrahIncomeAccountId,
            debit: 0,
            credit: profitOrLoss,
            description: `Umrah Profit (Travel Network) - ${booking.bookingNumber}`,
          });
        }

        if (profitOrLoss < 0) {
          rows.push({
            account: umrahIncomeAccountId,
            debit: Math.abs(profitOrLoss),
            credit: 0,
            description: `Umrah Loss (Travel Network) - ${booking.bookingNumber}`,
          });
        }

        // BALANCE CHECK
        const totalDebit = rows.reduce((sum, row) => sum + (row.debit || 0), 0);
        const totalCredit = rows.reduce(
          (sum, row) => sum + (row.credit || 0),
          0,
        );

        if (totalDebit !== totalCredit) {
          throw new Error(
            `Voucher is unbalanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
          );
        }

        // CREATE ZIP VOUCHER
        const voucherData = {
          type: "journalPortal",
          date: new Date().toISOString().split("T")[0],
          transactions: rows.map((txn, index) => ({
            metadata: { id: index },
            account: txn.account,
            description: txn.description,
            debit: txn.debit,
            credit: txn.credit,
          })),
        };

        const response = await zipAccountsService.createVoucher(voucherData);

        const createdVoucherId = response?.newVoucher?._id;
        if (createdVoucherId) {
          booking.voucherStatus = booking.voucherStatus || {};
          booking.voucherStatus.zipVoucherId = String(createdVoucherId);
          booking.voucherStatus.zipVoucherCreatedAt = new Date();
        }
      } else if (isAbidAir) {
        const abidAirAccount = accounts.find((account) =>
          ["Abid Air International (Vendor)", "Abid Air"].includes(
            account.account_name,
          ),
        );
        if (!abidAirAccount) {
          throw new Error(
            '"Abid Air International" supplier account not found in ZIP Accounts',
          );
        }

        const supplierDiscount = Math.max(
          0,
          Number(req.body.supplierDiscount) || 0,
        );

        // Persist the supplier discount on the booking document
        booking.supplierDiscount = supplierDiscount;

        const customerTotal = Math.max(
          0,
          Number(booking.pricing?.totalPrice) || 0,
        );
        const grossSupplierTotal = Math.max(
          0,
          Number(booking.supplierPricing?.totalPrice) || customerTotal,
        );
        // Admin-entered supplier discount reduces what we credit to Abid Air
        const supplierTotal = Math.max(
          0,
          grossSupplierTotal - supplierDiscount,
        );
        const rows = [
          {
            account: customerAccountId,
            debit: customerTotal,
            credit: 0,
            description: `Umrah Package Booking - ${booking.bookingNumber}`,
          },
          {
            account: abidAirAccount._id,
            debit: 0,
            credit: supplierTotal,
            description: `Abid Air International Expense - ${booking.bookingNumber}`,
          },
        ];
        // PROFIT ENTRY = margin baked into customerTotal + supplier discount (total we keep)
        const profitOrLoss = customerTotal - supplierTotal;
        if (profitOrLoss > 0) {
          rows.push({
            account: umrahIncomeAccountId,
            debit: 0,
            credit: profitOrLoss,
            description: `Umrah Profit (Abid Air International) - ${booking.bookingNumber}`,
          });
        } else if (profitOrLoss < 0) {
          rows.push({
            account: umrahIncomeAccountId,
            debit: Math.abs(profitOrLoss),
            credit: 0,
            description: `Umrah Loss (Abid Air International) - ${booking.bookingNumber}`,
          });
        }

        const response = await zipAccountsService.createVoucher({
          type: "journalPortal",
          date: new Date().toISOString().split("T")[0],
          transactions: rows.map((transaction, index) => ({
            metadata: { id: index },
            ...transaction,
          })),
        });
        const createdVoucherId = response?.newVoucher?._id;
        if (createdVoucherId) {
          booking.voucherStatus = booking.voucherStatus || {};
          booking.voucherStatus.zipVoucherId = String(createdVoucherId);
          booking.voucherStatus.zipVoucherCreatedAt = new Date();
        }
      } else {
        // =========================================
        // LOCAL-DB: FULL COST BREAKDOWN VOUCHER
        // =========================================

        // =========================================
        // SELLING PRICES (from packageTotals, incentive deducted per pax)
        // =========================================
        const packageTotals = linkedPackage.packageTotals || {};
        const incentive = packageTotals.incentive || 0;

        const roomTypeKeyMap = {
          double: "double",
          triple: "triple",
          quad: "quad",
          sharing: "shared",
        };
        const roomKey = roomTypeKeyMap[booking.roomType] || booking.roomType;

        const adultSellingPerPax = Math.round(
          (packageTotals[roomKey] || 0) - incentive,
        );
        const childSellingPerPax = Math.round(
          (packageTotals.childWithoutBed || 0) - incentive,
        );
        const infantSellingPerPax = Math.round(
          (packageTotals.infant || 0) - incentive,
        );

        const getSellingPrice = (type) => {
          if (type === "Child") return childSellingPerPax;
          if (type === "Infant") return infantSellingPerPax;
          return adultSellingPerPax;
        };

        // =========================================
        // FLIGHT INFO FOR DESCRIPTION
        // =========================================
        const firstFlight = linkedPackage.flights?.[0] || {};
        const travelDate = firstFlight.depDate
          ? new Date(firstFlight.depDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "N/A";
        const sector =
          firstFlight.sectorFrom && firstFlight.sectorTo
            ? `${firstFlight.sectorFrom}-${firstFlight.sectorTo}`
            : "N/A";

        let pnr = "N/A";
        if (linkedPackage.selectedGroupTicketId) {
          const ticketForPnr = await GroupTicket.findById(
            linkedPackage.selectedGroupTicketId,
          ).select("pnr");
          if (ticketForPnr?.pnr) pnr = ticketForPnr.pnr;
        }

        // =========================================
        // CALCULATIONS & BUILD VOUCHER ROWS
        // =========================================
        const passengers = booking.passengers || [];
        let totalSellingPrice = 0;
        let totalCost = 0;
        const rows = [];

        // CUSTOMER DEBIT — ONE ROW PER PAX
        passengers.forEach((pax) => {
          const paxName =
            `${pax.title || ""} ${pax.givenName || ""} ${pax.surName || ""}`.trim();
          const description = `Umrah Package, ${paxName} (${pax.type}), ${travelDate}, ${pnr} & ${sector}`;
          const baseSellingPrice = getSellingPrice(pax.type);
          const discount = Math.max(0, Number(pax.discount) || 0);
          const debitAmount = Math.max(0, baseSellingPrice - discount);
          totalSellingPrice += debitAmount;

          rows.push({
            account: customerAccountId,
            debit: debitAmount,
            credit: 0,
            description,
          });
        });

        // VISA CREDIT ENTRIES — ONE ROW PER PAX
        // Visa applies to every passenger (Adult, Child, Infant)
        if (linkedPackage.visa) {
          const visaSupplierId = linkedPackage.visa?.supplier?._id;
          const visaCostPerPax = Math.round(
            (linkedPackage.visa.buyingPrice || 0) *
              (linkedPackage.visa.buyingRoe || 1),
          );

          if (visaSupplierId && visaCostPerPax > 0) {
            passengers.forEach((pax) => {
              const paxName =
                `${pax.title || ""} ${pax.givenName || ""} ${pax.surName || ""}`.trim();

              totalCost += visaCostPerPax;
              rows.push({
                account: visaSupplierId,
                debit: 0,
                credit: visaCostPerPax,
                description: `Visa Expense - ${paxName} (${pax.type}) - ${booking.bookingNumber}`,
              });
            });
          }
        }

        // HOTEL CREDIT ENTRIES — ONE ROW PER ADULT PAX ONLY
        // Child/Infant travel without a bed, so they don't get a hotel entry
        if (Array.isArray(linkedPackage.hotels)) {
          const adultPassengers = passengers.filter((p) => p.type === "Adult");

          linkedPackage.hotels.forEach((hotel) => {
            const supplierId = hotel?.supplier?._id;
            let hotelCostPerPax = 0;
            const nightCount = hotel.nightCount || hotel.nights || 0;

            switch (booking.roomType) {
              case "double":
                hotelCostPerPax = Math.round(
                  (hotel.doubleRoom?.buyingPrice || 0) *
                    (hotel.doubleRoom?.buyingRoe || 1) *
                    nightCount,
                );
                break;
              case "triple":
                hotelCostPerPax = Math.round(
                  (hotel.tripleRoom?.buyingPrice || 0) *
                    (hotel.tripleRoom?.buyingRoe || 1) *
                    nightCount,
                );
                break;
              case "quad":
                hotelCostPerPax = Math.round(
                  (hotel.quadRoom?.buyingPrice || 0) *
                    (hotel.quadRoom?.buyingRoe || 1) *
                    nightCount,
                );
                break;
              case "sharing":
                hotelCostPerPax = Math.round(
                  (hotel.sharedRoom?.buyingPrice || 0) *
                    (hotel.sharedRoom?.buyingRoe || 1) *
                    nightCount,
                );
                break;
              default:
                hotelCostPerPax = 0;
            }

            if (supplierId && hotelCostPerPax > 0) {
              adultPassengers.forEach((pax) => {
                const paxName =
                  `${pax.title || ""} ${pax.givenName || ""} ${pax.surName || ""}`.trim();

                totalCost += hotelCostPerPax;
                rows.push({
                  account: supplierId,
                  debit: 0,
                  credit: hotelCostPerPax,
                  description: `Hotel Expense - ${hotel.name} - ${paxName} - ${booking.bookingNumber}`,
                });
              });
            }
          });
        }

        // TRANSPORT CREDIT ENTRIES
        if (Array.isArray(linkedPackage.transports)) {
          linkedPackage.transports.forEach((transport) => {
            const supplierId = transport?.supplier?._id;
            const transportCost = Math.round(
              (transport.buyingPrice || 0) * (transport.buyingRoe || 1),
            );

            if (supplierId && transportCost > 0) {
              totalCost += transportCost;
              rows.push({
                account: supplierId,
                debit: 0,
                credit: transportCost,
                description: `Transport Expense - ${transport.route} - ${booking.bookingNumber}`,
              });
            }
          });
        }

        // GROUP TICKET CREDIT ENTRY + DECREMENT SEATS
        if (linkedPackage.selectedGroupTicketId) {
          const ticket = await GroupTicket.findById(
            linkedPackage.selectedGroupTicketId,
          );

          if (ticket) {
            const supplierId = ticket?.user?._id;
            const buyingAdult = ticket?.price?.buyingAdultPrice || 0;
            const buyingChild = ticket?.price?.buyingChildPrice || 0;
            const buyingInfant = ticket?.price?.buyingInfantPrice || 0;

            const getTicketBuyingPrice = (type) => {
              if (type === "Child") return buyingChild;
              if (type === "Infant") return buyingInfant;
              return buyingAdult;
            };

            let ticketTotalCost = 0;

            if (supplierId) {
              passengers.forEach((pax) => {
                const paxName =
                  `${pax.title || ""} ${pax.givenName || ""} ${pax.surName || ""}`.trim();
                const paxCost = getTicketBuyingPrice(pax.type);

                if (paxCost > 0) {
                  ticketTotalCost += paxCost;
                  rows.push({
                    account: supplierId,
                    debit: 0,
                    credit: paxCost,
                    description: `Ticket Expense - ${paxName} (${pax.type}) - ${booking.bookingNumber}`,
                  });
                }
              });
            }

            totalCost += ticketTotalCost;

            // Decrement totalSeats on the GroupTicket
            // const seatPax =
            //   (booking.passengerCount?.adults || 0) +
            //   (booking.passengerCount?.children || 0);
            // if (seatPax > 0) {
            //   await GroupTicket.findByIdAndUpdate(ticket._id, {
            //     $inc: { totalSeats: -seatPax },
            //   });
            // }
          }
        }

        // DECREMENT AVAILABLE ROOMS ON PACKAGE
        // const totalPaxForRooms =
        //   booking.passengerCount?.total || passengers.length;
        // if (totalPaxForRooms > 0) {
        //   await GroupTicketing.findByIdAndUpdate(linkedPackage._id, {
        //     $inc: { availableRooms: -totalPaxForRooms },
        //   });
        // }

        // PROFIT / LOSS ENTRY
        const profitOrLoss = totalSellingPrice - totalCost;

        if (profitOrLoss > 0) {
          rows.push({
            account: umrahIncomeAccountId,
            debit: 0,
            credit: profitOrLoss,
            description: `Umrah Profit - ${booking.bookingNumber}`,
          });
        }

        if (profitOrLoss < 0) {
          rows.push({
            account: umrahIncomeAccountId,
            debit: Math.abs(profitOrLoss),
            credit: 0,
            description: `Umrah Loss - ${booking.bookingNumber}`,
          });
        }

        // BALANCE CHECK
        const totalDebit = rows.reduce((sum, row) => sum + (row.debit || 0), 0);
        const totalCredit = rows.reduce(
          (sum, row) => sum + (row.credit || 0),
          0,
        );

        if (totalDebit !== totalCredit) {
          // console.log("ROWS => ", rows);
          throw new Error(
            `Voucher is unbalanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
          );
        }

        // CREATE ZIP VOUCHER
        const voucherData = {
          type: "journalPortal",
          date: new Date().toISOString().split("T")[0],
          transactions: rows.map((txn, index) => ({
            metadata: { id: index },
            account: txn.account,
            description: txn.description,
            debit: txn.debit,
            credit: txn.credit,
          })),
        };

        const response = await zipAccountsService.createVoucher(voucherData);
        // console.log("ZIP Voucher Created:", response);

        // Save the ZIP voucher ID to the booking
        const createdVoucherId = response?.newVoucher?._id;
        if (createdVoucherId) {
          booking.voucherStatus = booking.voucherStatus || {};
          booking.voucherStatus.zipVoucherId = String(createdVoucherId);
          booking.voucherStatus.zipVoucherCreatedAt = new Date();
        }
      } // end else (local-db)
    } // end if (oldStatus !== "Confirmed" && status === "Confirmed")

    // =========================================
    // RESTOCK PACKAGE ROOMS WHEN BOOKING IS CANCELLED
    // =========================================
    if (
      (status === "Cancelled" && oldStatus !== "Cancelled") ||
      (oldStatus !== "On Hold" && status === "On Hold") ||
      (oldStatus !== "Pending" && status === "Pending") ||
      (oldStatus !== "In Progress" && status === "In Progress")
    ) {
      if (isAbidAir && status === "Cancelled" && oldStatus !== "Cancelled") {
        const supplierStatus = String(
          booking.supplierBookingStatus || "",
        ).toLowerCase();
        if (
          !booking.supplierBookingId ||
          supplierStatus === "supplier_pending"
        ) {
          const error = new Error(
            "Abid Air booking must be reconciled before it can be cancelled locally",
          );
          error.name = "AbidAirApiError";
          error.status = 409;
          error.code = "ABID_AIR_RECONCILIATION_REQUIRED";
          throw error;
        }
        if (["on hold", "on_hold"].includes(supplierStatus)) {
          const supplierCancellation = await cancelAbidAirBooking(
            booking.supplierBookingId,
          );
          booking.supplierBookingStatus =
            supplierCancellation?.status || "Cancelled";
          booking.supplierBookingData = {
            ...(booking.supplierBookingData || {}),
            cancellation: supplierCancellation,
          };
        } else if (!["cancelled", "canceled"].includes(supplierStatus)) {
          const error = new Error(
            `Abid Air booking cannot be cancelled while supplier status is "${booking.supplierBookingStatus}"`,
          );
          error.name = "AbidAirApiError";
          error.status = 409;
          error.code = "ABID_AIR_INVALID_CANCELLATION_STATE";
          throw error;
        }
      }

      if (!isExternalPackage) {
        await restockUmrahPackageRooms(booking);
      }

      // Void the ZIP Accounts journal voucher if it was created
      const zipVoucherId = booking.voucherStatus?.zipVoucherId;
      if (zipVoucherId) {
        try {
          await zipAccountsService.voidUnvoidVoucher(zipVoucherId, "void");
          // console.log(`ZIP Voucher ${zipVoucherId} voided successfully`);
        } catch (voidError) {
          console.error(
            `Failed to void ZIP voucher ${zipVoucherId}:`,
            voidError.message,
          );
          // Non-fatal: allow cancellation to proceed even if voiding fails
        }
      }
    }

    // =========================================
    // UPDATE OVERALL STATUS
    // =========================================
    booking.overallStatus = status;
    booking.expiresAt =
      status === "On Hold" || status === "Pending"
        ? await calculateBookingExpiresAt(new Date(), packageSource)
        : null;

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Umrah booking "${booking.bookingNumber}" overall status changed from "${oldStatus}" to "${status}"`,
    });

    res.status(200).json({
      success: true,
      message: "Overall status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Overall Status Error:", error.message);
    res
      .status(
        error?.name === "AbidAirApiError" ? getAbidAirHttpStatus(error) : 400,
      )
      .json({
        success: false,
        message: error.message,
        code: error?.code,
        retryAfter: error?.retryAfter || undefined,
        requestId: error?.requestId || undefined,
      });
  }
};

// -------------------------
// UPDATE BOOKING PASSENGER WISE DISCOUNT
// -------------------------

export const savePassengerDiscounts = async (req, res) => {
  try {
    const { bookingId, passengers } = req.body;

    // Validation
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "bookingId is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bookingId",
      });
    }

    if (!Array.isArray(passengers) || passengers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Passengers array is required",
      });
    }

    // Find Booking
    const booking = await UmrahPackageBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Update / Upsert passenger discounts
    booking.passengers = booking.passengers.map((existingPassenger) => {
      const matchedPassenger = passengers.find(
        (p) =>
          p.passport?.toUpperCase().trim() ===
          existingPassenger.passport?.toUpperCase().trim(),
      );

      if (matchedPassenger) {
        existingPassenger.discount = matchedPassenger.discount || 0;
      }

      return existingPassenger;
    });

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Passenger discounts saved for Umrah booking "${booking.bookingNumber}"`,
    });

    return res.status(200).json({
      success: true,
      message: "Passenger discounts saved successfully",
      data: booking.passengers,
    });
  } catch (error) {
    console.error("savePassengerDiscounts error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getBookedSeats = async (req, res) => {
  try {
    const { groupId } = req.query;
    const groupFilter = groupId ? { groupId: String(groupId) } : {};

    // 1. Group Tickets se booked seats (Booking collection)
    const groupTicketSeats = await Booking.aggregate([
      {
        $match: {
          ...groupFilter,
          status: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: "$groupId",
          groupId: { $first: "$groupId" },
          groupType: { $first: "$groupType" },
          totalSeats: {
            $sum: {
              $add: [
                { $ifNull: ["$adultsCount", 0] },
                { $ifNull: ["$childrenCount", 0] },
              ],
            },
          },
          totalAdults: { $sum: "$adultsCount" },
          totalChildren: { $sum: "$childrenCount" },
          totalInfants: { $sum: "$infantsCount" },
          bookings: { $sum: 1 },
        },
      },
    ]);

    // 2. Umrah Packages se booked seats jo group ticket se关联 hain
    const umrahPackageGroupSeats = await UmrahPackageBooking.aggregate([
      {
        $match: {
          overallStatus: { $nin: ["Cancelled"] },
        },
      },
      {
        $addFields: {
          packageObjectId: {
            $convert: {
              input: "$packageId",
              to: "objectId",
              onError: null,
              onNull: null,
            },
          },
        },
      },
      {
        // Lookup package details to get selectedGroupTicketId
        $lookup: {
          from: "umrahpackagemodels", // Your GroupTicketing collection
          localField: "packageObjectId",
          foreignField: "_id",
          as: "packageInfo",
        },
      },
      {
        $unwind: {
          path: "$packageInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Filter where selectedGroupTicketId exists
        $match: {
          "packageInfo.selectedGroupTicketId": {
            ...(groupId ? { $eq: String(groupId) } : {}),
            $nin: [null, ""],
          },
        },
      },
      {
        $group: {
          _id: "$packageInfo.selectedGroupTicketId",
          groupId: { $first: "$packageInfo.selectedGroupTicketId" },
          groupType: { $first: "Umrah Package Group" },
          totalSeats: {
            $sum: {
              $add: [
                { $ifNull: ["$passengerCount.adults", 0] },
                { $ifNull: ["$passengerCount.children", 0] },
              ],
            },
          },
          totalAdults: { $sum: "$passengerCount.adults" },
          totalChildren: { $sum: "$passengerCount.children" },
          totalInfants: { $sum: "$passengerCount.infants" },
          bookings: { $sum: 1 },
        },
      },
    ]);

    // 3. Combine both results by the same group ticket id
    const groupTotals = new Map();

    const addGroupTotals = (group, source) => {
      const id = group.groupId?.toString();
      if (!id) return;

      const current = groupTotals.get(id) || {
        groupId: id,
        groupType: group.groupType,
        totalSeats: 0,
        totalAdults: 0,
        totalChildren: 0,
        totalInfants: 0,
        totalBookings: 0,
        directGroupTicketBookings: 0,
        umrahPackageBookings: 0,
      };

      current.totalSeats += group.totalSeats || 0;
      current.totalAdults += group.totalAdults || 0;
      current.totalChildren += group.totalChildren || 0;
      current.totalInfants += group.totalInfants || 0;
      current.totalBookings += group.bookings || 0;

      if (source === "groupTicket") {
        current.directGroupTicketBookings += group.bookings || 0;
      }

      if (source === "umrahPackage") {
        current.umrahPackageBookings += group.bookings || 0;
        current.groupType =
          current.groupType === group.groupType ? current.groupType : "Mixed";
      }

      groupTotals.set(id, current);
    };

    groupTicketSeats.forEach((group) => addGroupTotals(group, "groupTicket"));
    umrahPackageGroupSeats.forEach((group) =>
      addGroupTotals(group, "umrahPackage"),
    );

    const breakdownByGroup = Array.from(groupTotals.values());

    res.status(200).json({
      success: true,
      data: {
        breakdown: {
          byGroup: breakdownByGroup,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching booked seats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching booked seats",
      error: error.message,
    });
  }
};
