import express from "express";
import {
  getVisibilitySettings,
  getVisibilityBySource,
  togglePackageVisibility,
  bulkUpdateVisibility,
  initializeTravelNetworkVisibility,
  getPackageVisibility,
  deleteVisibilitySetting,
} from "../controllers/packageVisibility.controller.js";

const router = express.Router();

// GET all visibility settings
router.get("/", getVisibilitySettings);

// GET visibility by source
router.get("/source/:source", getVisibilityBySource);

// GET visibility for a specific package
router.get("/:packageId/:source", getPackageVisibility);

// POST toggle visibility
router.post("/toggle", togglePackageVisibility);

// POST bulk update visibility
router.post("/bulk", bulkUpdateVisibility);

// POST initialize visibility for travel network packages
router.post("/initialize", initializeTravelNetworkVisibility);

// DELETE visibility setting
router.delete("/:packageId/:source", deleteVisibilitySetting);

export default router;
