import PackageVisibility from "../models/PackageVisibility.js";

// Get all visibility settings
export const getVisibilitySettings = async (req, res) => {
  try {
    const settings = await PackageVisibility.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching visibility settings:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching visibility settings",
      error: error.message,
    });
  }
};

// Get visibility settings for a specific source
export const getVisibilityBySource = async (req, res) => {
  try {
    const { source } = req.params;

    if (!["local-db", "travel-network", "abid-air"].includes(source)) {
      return res.status(400).json({
        success: false,
        message: "Invalid source. Must be 'local-db', 'travel-network', or 'abid-air'",
      });
    }

    const settings = await PackageVisibility.find({ source });

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching visibility by source:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching visibility settings",
      error: error.message,
    });
  }
};

// Toggle visibility for a single package
export const togglePackageVisibility = async (req, res) => {
  try {
    const { packageId, isVisible, source, externalId } = req.body;

    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: "packageId is required",
      });
    }

    if (typeof isVisible !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isVisible must be a boolean",
      });
    }

    if (!source) {
      return res.status(400).json({
        success: false,
        message: "source is required (local-db, travel-network, or abid-air)",
      });
    }

    if (!["local-db", "travel-network", "abid-air"].includes(source)) {
      return res.status(400).json({
        success: false,
        message: "Invalid source",
      });
    }

    // Find existing record
    let record = await PackageVisibility.findOne({ packageId, source });

    if (record) {
      record.isVisible = isVisible;
      await record.save();
    } else {
      record = await PackageVisibility.create({
        packageId,
        source,
        externalId: externalId || packageId,
        isVisible,
      });
    }

    res.json({
      success: true,
      data: record,
      message: `Package visibility updated to ${isVisible ? "visible" : "hidden"}`,
    });
  } catch (error) {
    console.error("Error toggling visibility:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling visibility",
      error: error.message,
    });
  }
};

// Bulk update visibility for multiple packages
export const bulkUpdateVisibility = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: "updates array is required",
      });
    }

    const results = [];

    for (const update of updates) {
      const { packageId, source, isVisible, externalId } = update;

      if (!packageId || !source || typeof isVisible !== "boolean") {
        continue;
      }

      let record = await PackageVisibility.findOne({ packageId, source });

      if (record) {
        record.isVisible = isVisible;
        await record.save();
      } else {
        record = await PackageVisibility.create({
          packageId,
          source,
          externalId: externalId || packageId,
          isVisible,
        });
      }

      results.push(record);
    }

    res.json({
      success: true,
      data: results,
      message: `${results.length} packages updated successfully`,
    });
  } catch (error) {
    console.error("Error bulk updating visibility:", error);
    res.status(500).json({
      success: false,
      message: "Error updating visibility",
      error: error.message,
    });
  }
};

// Initialize visibility settings for travel network packages
export const initializeTravelNetworkVisibility = async (req, res) => {
  try {
    const { packageIds } = req.body;

    if (!packageIds || !Array.isArray(packageIds)) {
      return res.status(400).json({
        success: false,
        message: "packageIds array is required",
      });
    }

    const results = [];

    for (const pkg of packageIds) {
      const { id, externalId } = pkg;

      let record = await PackageVisibility.findOne({
        packageId: id,
        source: "travel-network",
      });

      if (!record) {
        record = await PackageVisibility.create({
          packageId: id,
          source: "travel-network",
          externalId: externalId || id,
          isVisible: true,
        });
        results.push(record);
      }
    }

    res.json({
      success: true,
      data: results,
      message: `${results.length} packages initialized`,
    });
  } catch (error) {
    console.error("Error initializing visibility:", error);
    res.status(500).json({
      success: false,
      message: "Error initializing visibility",
      error: error.message,
    });
  }
};

// Get visibility for a specific package
export const getPackageVisibility = async (req, res) => {
  try {
    const { packageId, source } = req.params;

    const record = await PackageVisibility.findOne({ packageId, source });

    res.json({
      success: true,
      data: record || { packageId, source, isVisible: true },
    });
  } catch (error) {
    console.error("Error fetching package visibility:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching visibility",
      error: error.message,
    });
  }
};

// Delete visibility setting (reset to default)
export const deleteVisibilitySetting = async (req, res) => {
  try {
    const { packageId, source } = req.params;

    const result = await PackageVisibility.findOneAndDelete({
      packageId,
      source,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Visibility setting not found",
      });
    }

    res.json({
      success: true,
      message: "Visibility setting deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting visibility setting:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting visibility setting",
      error: error.message,
    });
  }
};
