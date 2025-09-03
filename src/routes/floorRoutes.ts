// routes/floorRoutes.ts
import express from "express";
import { errorResponse, successResponse } from "../utils/responseHandler";
import floor from "../schema/floorSchema";
import layout from "../schema/layoutSchema";
import mongoose from "mongoose";
import { authenticate, checkRole } from "../middleware/auth";
import Fan from "../schema/fanSchema";

const router = express.Router();

// Add Floor -> optionally create Layout
router.post("/", authenticate, checkRole("SuperAdmin"), async (req, res) => {
  const { name, file } = req.body;

  if (!name) {
    return errorResponse(res, "name is required", 400);
  }

  try {
    // Check duplicate floor
    const existingFloor = await floor.findOne({ name: name.trim() });
    if (existingFloor) {
      return errorResponse(res, "Floor name already exists", 400);
    }

    // 1. Save floor (with file path if provided)
    const floorAdd = new floor({ name, file: file || null });
    await floorAdd.save();

    let layoutAdd = null;

    // 2. Only create layout if file exists
    if (file) {
      layoutAdd = new layout({
        floorId: floorAdd._id,
        meta: {},   // ✅ only storing meta & floorId
      });
      await layoutAdd.save();
    }

    return successResponse(
      res,
      { floor: floorAdd, layout: layoutAdd },
      layoutAdd
        ? "Floor and layout added successfully"
        : "Floor added successfully",
      201
    );
  } catch (err) {
    return errorResponse(res, "Internal server error", 500, err);
  }
});


// Get All Floors with Layout
router.get("/", authenticate, async (req, res) => {
  try {
    const floorsWithLayouts = await floor.aggregate([
      {
        $lookup: {
          from: "layouts",
          localField: "_id", // floor._id
          foreignField: "floorId", // layout.floorId
          as: "layout",
        },
      },
      {
        $unwind: {
          path: "$layout",
          preserveNullAndEmptyArrays: true, // if no layout, return floor with layout: null
        },
      },
    ]);

    return successResponse(
      res,
      floorsWithLayouts,
      "All floors with layout fetched successfully"
    );
  } catch (err) {
    return errorResponse(res, "Internal server error", 500, err);
  }
});

// Update Floor (name/path)
router.put("/:id", authenticate, checkRole("SuperAdmin"), async (req, res) => {
  const { id } = req.params;
  const { name, file } = req.body;

  try {
    const floorFind = await floor.findById(id);
    if (!floorFind) {
      return errorResponse(res, "Floor not found", 404);
    }

    // --- Update floor fields ---
    if (name) {
      const existingFloor = await floor.findOne({
        name: name.trim(),
        _id: { $ne: id }, // exclude current floor
      });
      if (existingFloor) {
        return errorResponse(res, "Floor name already exists", 400);
      }
      floorFind.name = name.trim();
    }

    if (file) {
      // still allow floor table to hold file (path or name)
      floorFind.file = file;
    }

    await floorFind.save();

    // --- Handle layout logic ---
    let layoutDoc = await layout.findOne({ floorId: floorFind._id });

    if (file) {
      if (!layoutDoc) {
        layoutDoc = new layout({
          floorId: floorFind._id,
          meta: {},
        });
        await layoutDoc.save();
      }
    }

    return successResponse(
      res,
      { floor: floorFind, layout: layoutDoc },
      layoutDoc
        ? "Floor and layout updated successfully"
        : "Floor updated successfully",
      200
    );
  } catch (err) {
    return errorResponse(res, "Internal server error", 500, err);
  }
});

// Update Layout JSON meta
router.put(
  "/layouts/:floorId",
  authenticate,
  checkRole("SuperAdmin"),
  async (req, res) => {
    const { floorId } = req.params;
    const { meta } = req.body;

    if (!meta) return errorResponse(res, "meta JSON is required", 400);

    try {
      const layoutFind: any = await layout.findOne({ floorId });
      if (!layoutFind)
        return errorResponse(res, "Layout not found for this floor", 404);

      layoutFind.meta = meta;
      await layoutFind.save();

      return successResponse(res, layout, "Layout updated successfully");
    } catch (err) {
      return errorResponse(res, "Internal server error", 500, err);
    }
  }
);

// Get Floor by ID with Layout (using relation query)
router.get("/get/:id", authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const floorWithLayout = await floor.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "layouts", // collection name in MongoDB
          localField: "_id", // floor._id
          foreignField: "floorId", // layout.floorId
          as: "layout",
        },
      },
      {
        $unwind: {
          path: "$layout",
          preserveNullAndEmptyArrays: true, // keep floor even if no layout
        },
      },
    ]);

    if (!floorWithLayout || floorWithLayout.length === 0) {
      return errorResponse(res, "Floor not found", 404);
    }

    return successResponse(
      res,
      floorWithLayout[0],
      "Floor with layout fetched successfully",
      200
    );
  } catch (err) {
    return errorResponse(res, "Internal server error", 500, err);
  }
});

// Delete Floor (with related data + backup)
router.delete("/:id", authenticate, checkRole("SuperAdmin"), async (req, res) => {
  const { id } = req.params;

  try {
    const floorFind = await floor.findById(id);
    if (!floorFind) {
      return errorResponse(res, "Floor not found", 404);
    }

    // // --- Collect related data ---
    // const layoutFind = await layout.findOne({ floorId: id });
    // const fansFind = await Fan.find({ floorId: id });

    // // --- Build backup payload ---
    // const backupData = {
    //   type: "FLOOR_DELETE",
    //   floor: floorFind.toObject(),
    //   layout: layoutFind ? layoutFind.toObject() : null,
    //   fans: fansFind.map((f) => f.toObject()),
    //   deletedAt: new Date(),
    // };

    // // --- Save backup ---
    // const backupDoc = new Backup(backupData);
    // await backupDoc.save();

    // --- Delete related data ---
    const deleteFloorData:any= await Promise.all([
      layout.deleteOne({ floorId: id }),
      Fan.deleteMany({ floorId: id }),
      floor.deleteOne({ _id: id }),
    ]);

      return successResponse(
      res,
      deleteFloorData,
      "All floors with layout fetched successfully",200
    );

  } catch (err) {
    return errorResponse(res, "Internal server error", 500, err);
  }
});


export default router;
