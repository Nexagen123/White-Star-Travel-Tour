import express from "express";
import {
  checkAbidAirFlightAvailability,
  checkAbidAirPackageAvailability,
} from "../controllers/abidAir.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/flight/:groupId/availability", checkAbidAirFlightAvailability);
router.get(
  "/package/:packageId/availability",
  checkAbidAirPackageAvailability,
);

export default router;
