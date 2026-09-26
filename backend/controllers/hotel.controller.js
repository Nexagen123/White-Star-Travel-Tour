// controllers/hotelController.js

import Hotel from "../models/Hotel.js";
import ActivityLog from "../models/activitylogs.js";

// CREATE HOTEL
export const createHotel = async (req, res) => {
  try {
    const {
      hotelName,
      city,
      distance,
      rating,
      mapUrl,
    } = req.body;

    const hotel = await Hotel.create({
      hotelName,
      city,
      distance,
      rating,
      mapUrl,
    });

    await ActivityLog.create({
      user: req.user._id,
      type: "Hotel",
      refModel: "Hotel",
      refId: hotel._id,
      description: `Hotel "${hotel.hotelName}" (${hotel.city}) created`,
    });

    res.status(201).json({
      success: true,
      message: "Hotel created successfully",
      data: hotel,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL HOTELS
export const getAllHotels = async (req, res) => {
  try {
    const { q } = req.query;
    const query = q
      ? {
          $or: [
            { hotelName: { $regex: q, $options: "i" } },
            { city: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const hotels = await Hotel.find(query)
      .sort({ hotelName: 1, createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// SEARCH HOTELS (alias endpoint)
export const searchHotels = async (req, res) => {
  return getAllHotels(req, res);
};

// GET SINGLE HOTEL
export const getSingleHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    res.status(200).json({
      success: true,
      data: hotel,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE HOTEL
export const updateHotel = async (req, res) => {
  try {
    const {
      hotelName,
      city,
      distance,
      rating,
      mapUrl,
    } = req.body;

    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      {
        hotelName,
        city,
        distance,
        rating,
        mapUrl,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "Hotel",
      refModel: "Hotel",
      refId: hotel._id,
      description: `Hotel "${hotel.hotelName}" (${hotel.city}) updated`,
    });

    res.status(200).json({
      success: true,
      message: "Hotel updated successfully",
      data: hotel,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE HOTEL
export const deleteHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndDelete(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "Hotel",
      description: `Hotel "${hotel.hotelName}" (${hotel.city}) deleted`,
    });

    res.status(200).json({
      success: true,
      message: "Hotel deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
