// routes/fanRoutes.ts
import express from "express";
import { errorResponse, successResponse } from "../utils/responseHandler";
import Fan from "../schema/fanSchema";
import mongoose from "mongoose";
import { authenticate, checkRole } from "../middleware/auth";

const router = express.Router();

// ---------------- FAN ROUTES ---------------- //

// Add Fan to a Floor
router.post("/", authenticate,checkRole("SuperAdmin"),
 async (req, res) => {
  const { name, rpm, status, floorId } = req.body;

  if (!name) return errorResponse(res, "Fan name is required", 400);

  try {
        const existingFan = await Fan.findOne({ name: name.trim() ,floorId:floorId});
        if (existingFan) {
          return errorResponse(res, "Fan name already exists for this floor", 400);
        }
    
    const floorExists = await mongoose.model("floor").findById(floorId);
    if (!floorExists) {
      return errorResponse(res, "Floor not found", 404);
    }

    const fan = new Fan({
      name,
      rpm: rpm || 0,
      status: status || "OFF",
      floorId: new mongoose.Types.ObjectId(floorId),
    });
    await fan.save();

    return successResponse(res, fan, "Fan added successfully", 201);
  } catch (err) {
    return errorResponse(res, "Internal server error", 500, err);
  }
});

// Get All Fans in a Floor
router.get("/:floorId/fans", authenticate, async (req, res) => {
  const { floorId } = req.params;

  try {
        const floorExists = await mongoose.model("floor").findById(floorId);
    if (!floorExists) {
      return errorResponse(res, "Floor not found", 404);
    }

    const fans = await Fan.aggregate([
      {
        $match: { floorId: new mongoose.Types.ObjectId(floorId) },
      },
      {
        $lookup: {
          from: "floors",             // collection name in MongoDB
          localField: "floorId",      // field in Fan
          foreignField: "_id",        // field in Floor
          as: "floorData",
        },
      },
      {
        $unwind: "$floorData", // convert array -> object
      },
    ]);
    return successResponse(res, fans, "All fans fetched successfully");
  } catch (err) {
    return errorResponse(res, "Internal server error", 500, err);
  }
});

// Get Fan by ID (with Floor relation)
router.get("/:floorId/fans/:fanId", authenticate, async (req, res) => {
  const { floorId, fanId } = req.params;

  try {
    const fan = await Fan.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(fanId),
          floorId: new mongoose.Types.ObjectId(floorId),
        },
      },
      {
        $lookup: {
          from: "floors",
          localField: "floorId",
          foreignField: "_id",
          as: "floor",
        },
      },
      { $unwind: "$floor" },
    ]);

    if (!fan || fan.length === 0) {
      return errorResponse(res, "Fan not found", 404);
    }

    return successResponse(res, fan[0], "Fan fetched successfully");
  } catch (err) {
    return errorResponse(res, "Internal server error", 500, err);
  }
});

// Update Fan Status
router.put("/:floorId/fans/:fanId/status", authenticate, checkRole("SuperAdmin"),async (req, res) => {
  const { floorId, fanId } = req.params;
  const { status } = req.body;

  if (!status) return errorResponse(res, "status is required", 400);

  try {
    const fan = await Fan.findOneAndUpdate(
      { _id: fanId, floorId },
      { status },
      { new: true }
    );

    if (!fan) return errorResponse(res, "Fan not found", 404);

    return successResponse(res, fan, "Fan status updated successfully");
  } catch (err) {
    return errorResponse(res, "Internal server error", 500, err);
  }
});

// Update Fan Speed (RPM)
router.put("/:floorId/fans/:fanId/speed", authenticate, checkRole("SuperAdmin"),async (req, res) => {
  const { floorId, fanId } = req.params;
  const { rpm } = req.body;

  if (rpm === undefined) return errorResponse(res, "rpm is required", 400);

  try {
    const status = rpm > 0 ? "ON" : "OFF";

    const fan = await Fan.findOneAndUpdate(
      { _id: fanId, floorId },
      { rpm, status },
      { new: true }
    );

    if (!fan) return errorResponse(res, "Fan not found", 404);

    return successResponse(res, fan, "Fan speed updated successfully");
  } catch (err) {
    return errorResponse(res, "Internal server error", 500, err);
  }
});

// Get All Fans across All Floors
router.get("/", authenticate, async (req, res) => {
  try {
    const fans = await Fan.aggregate([
      {
        $lookup: {
          from: "floors",
          localField: "floorId",
          foreignField: "_id",
          as: "floor",
        },
      },
      { $unwind: "$floor" }, // include floor details
    ]);

    return successResponse(
      res,
      fans,
      "All fans from all floors fetched successfully"
    );
  } catch (err) {
    return errorResponse(res, "Internal server error", 500, err);
  }
});

export default router;
