import TravelNetworkMargin from "../models/TravelNetworkMargin.js";

const ALLOWED_SOURCES = ["travel-network", "abid-air"];

const resolveSource = (value) => {
  const source = String(value || "travel-network").trim().toLowerCase();
  return ALLOWED_SOURCES.includes(source) ? source : "travel-network";
};

/* ===========================
   GET Margin (Travel Network / Abid Air)
   Returns the current margin for the requested supplier source's umrah
   packages. Public endpoint (no auth) so frontend can fetch it without login.
=========================== */
export const getTravelNetworkMargin = async (req, res) => {
  try {
    const source = resolveSource(req.query.source);

    // Legacy records (created before "source" existed) always meant
    // travel-network — match those too so old data keeps working.
    const query =
      source === "travel-network"
        ? { type: "umrah", $or: [{ source }, { source: { $exists: false } }] }
        : { type: "umrah", source };

    const record = await TravelNetworkMargin.findOne(query);

    res.status(200).json({
      success: true,
      data: {
        marginAmount: record?.marginAmount ?? 0,
        source,
      },
    });
  } catch (error) {
    console.error("Get Margin Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===========================
   SET / UPDATE Margin (Admin only)
   Upserts the single "umrah" margin record for the given supplier source.
=========================== */
export const setTravelNetworkMargin = async (req, res) => {
  try {
    const marginAmount = Number(req.body.marginAmount);
    const source = resolveSource(req.body.source);

    if (isNaN(marginAmount)) {
      return res.status(400).json({
        success: false,
        message: "marginAmount must be a valid number",
      });
    }

    const record = await TravelNetworkMargin.findOneAndUpdate(
      { type: "umrah", source },
      {
        marginAmount,
        source,
        updatedBy: req.user?._id ?? null,
      },
      { new: true, upsert: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Margin updated successfully",
      data: {
        marginAmount: record.marginAmount,
        source,
      },
    });
  } catch (error) {
    console.error("Set Margin Error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
