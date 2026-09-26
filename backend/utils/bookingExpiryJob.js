import Booking from "../models/Booking.js";
// import GroupTicketing from "../models/GroupTicketing.js";
import UmrahPackageBooking from "../models/UmrahPackageBooking.js";
import { restockUmrahPackageRooms } from "../utils/umrahPackageInventory.js";
import { cancelBooking as cancelAbidAirBooking } from "./Abid-Air.js";

export const startBookingExpiryJob = () => {
  setInterval(async () => {
    try {
      const expiredBookings = await Booking.find({
        status: { $in: ["on hold", "pending"] },
        expiresAt: { $lte: new Date() },
      });

      for (const booking of expiredBookings) {
        console.log("Running booking expiry job...");
        if (booking.source === "abid-air") {
          const supplierIsOnHold = ["on hold", "on_hold"].includes(
            String(booking.supplierBookingStatus || "").toLowerCase(),
          );
          if (!booking.supplierBookingId || !supplierIsOnHold) {
            console.error("Abid Air expiry requires reconciliation", {
              bookingId: String(booking._id),
              supplierBookingId: booking.supplierBookingId || null,
              supplierStatus: booking.supplierBookingStatus || null,
            });
            continue;
          }
          try {
            const cancellation = await cancelAbidAirBooking(
              booking.supplierBookingId,
            );
            booking.supplierBookingStatus =
              cancellation?.status || "cancelled";
            booking.supplierBookingData = {
              ...(booking.supplierBookingData || {}),
              cancellation,
            };
          } catch (error) {
            console.error("Abid Air expiry cancellation failed", {
              bookingId: String(booking._id),
              status: error.status,
              code: error.code,
              requestId: error.requestId,
            });
            continue;
          }
        }
        booking.status = "cancelled";
        booking.expiresAt = null;
        booking.cancelledAt = new Date();
        await booking.save();

        // const seatsToReturn = booking.adultsCount + booking.childrenCount;

        // await GroupTicketing.updateOne(
        //   { _id: booking.groupId },
        //   { $inc: { totalSeats: seatsToReturn } },
        // );

        console.log(`Auto-cancelled booking ${booking._id}`);
      }

      const expiredUmrahBookings = await UmrahPackageBooking.find({
        overallStatus: { $in: ["On Hold", "Pending"] },
        expiresAt: { $lte: new Date() },
      });

      for (const booking of expiredUmrahBookings) {
        if (booking.packageSource === "abid-air") {
          const supplierIsOnHold = ["on hold", "on_hold"].includes(
            String(booking.supplierBookingStatus || "").toLowerCase(),
          );
          if (!booking.supplierBookingId || !supplierIsOnHold) {
            console.error("Abid Air Umrah expiry requires reconciliation", {
              bookingId: String(booking._id),
              supplierBookingId: booking.supplierBookingId || null,
              supplierStatus: booking.supplierBookingStatus || null,
            });
            continue;
          }
          try {
            const cancellation = await cancelAbidAirBooking(
              booking.supplierBookingId,
            );
            booking.supplierBookingStatus =
              cancellation?.status || "Cancelled";
            booking.supplierBookingData = {
              ...(booking.supplierBookingData || {}),
              cancellation,
            };
          } catch (error) {
            console.error("Abid Air Umrah expiry cancellation failed", {
              bookingId: String(booking._id),
              status: error.status,
              code: error.code,
              requestId: error.requestId,
            });
            continue;
          }
        }
        booking.overallStatus = "Cancelled";
        booking.expiresAt = null;
        if (booking.packageSource === "local-db") {
          await restockUmrahPackageRooms(booking);
        }
        await booking.save();

        console.log(`Auto-cancelled Umrah package booking ${booking._id}`);
      }
    } catch (err) {
      console.error("Expiry job error:", err);
    }
  }, 60 * 1000); // runs every 1 minute
};
