import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getTravelNetworkMargin,
  setTravelNetworkMargin,
} from "../controllers/travelNetworkMargin.controller.js";

const router = express.Router();

// Public GET — frontend needs this without admin auth
router.get("/", getTravelNetworkMargin);

// Admin only — set/update margin
router.post("/", protect, setTravelNetworkMargin);

export default router;
