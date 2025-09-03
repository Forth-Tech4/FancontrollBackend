// routes/fanRoutes.ts
import express from "express";
import { errorResponse, successResponse } from "../utils/responseHandler";
import Fan from "../schema/fanSchema";
import mongoose from "mongoose";
import csv from "csv-parser";
import Fanmodel from "../schema/fanModelSchema";
import fs from "fs";
import { authenticate, checkRole } from "../middleware/auth";
import multer from "multer";
const router = express.Router();
const upload = multer({ dest: "uploads/" });

// ---------------- FAN ROUTES ---------------- //
// Upload CSV for adding Fans
router.post(
  "/upload-fans",
  authenticate,
  checkRole("SuperAdmin"),
  upload.single("file"),
  async (req: any, res) => {
    try {
      if (!req.file) return errorResponse(res, "No file uploaded", 400);

      const { floorId } = req.body;
      if (!floorId) {
        fs.unlinkSync(req.file.path);
        return errorResponse(res, "Missing floorId", 400);
      }

      const fansToInsert: any[] = [];
      const errors: any[] = [];
      let rowIndex = 1;

      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("error", (err) => {
          fs.unlinkSync(req.file.path);
          return errorResponse(res, "Invalid CSV format", 400, err);
        })
        .on("data", (row) => {
          rowIndex++;

          const fanId = row["FanId"];
          const name = row["Fan Name"];
          const fanModelId = row["FanModelId"];
          const rpm = row["RPM"];

          if (!fanId || !name || !fanModelId) {
            errors.push({
              row: rowIndex,
              rowData: row,
              error: "Missing FanId, Fan Name or FanModelId",
            });
            return;
          }

          const rpmValue = rpm ? Number(rpm) : 0;
          const statusValue = rpmValue > 0 ? "ON" : "OFF";

          fansToInsert.push({
            fanId: Number(fanId),
            floorId,
            fanModelId,
            name,
            rpm: rpmValue,
            status: statusValue,
          });
        })
        .on("end", async () => {
          try {
            fs.unlinkSync(req.file.path);

            // ✅ Validate against each model’s totalDevices
            const groupedByModel: any = {};
            fansToInsert.forEach((f) => {
              groupedByModel[f.fanModelId] =
                (groupedByModel[f.fanModelId] || 0) + 1;
            });

            for (const modelId of Object.keys(groupedByModel)) {
              const fanModel = await Fanmodel.findById(modelId);
              if (!fanModel) {
                return errorResponse(
                  res,
                  `Fan model not found: ${modelId}`,
                  404
                );
              }
              if (groupedByModel[modelId] > fanModel.totalDevices) {
                return errorResponse(
                  res,
                  "Exceeds model totalDevices limit",
                  400,
                  {
                    modelId,
                    allowed: fanModel.totalDevices,
                    received: groupedByModel[modelId],
                  }
                );
              }
            }
            const validFans: any[] = [];

            for (const fan of fansToInsert) {
              const exists = await Fan.findOne({
                fanModelId: fan.fanModelId,
                fanId: fan.fanId,
              });

              if (exists) {
                errors.push({
                  fanId: fan.fanId,
                  name: fan.name,
                  fanModelId: fan.fanModelId,
                  error: "Fan already exists for this model",
                });
              } else {
                validFans.push(fan);
              }
            }
            const insertedFans =
              validFans.length > 0 ? await Fan.insertMany(validFans) : [];

            return successResponse(
              res,
              {
                insertedCount: insertedFans.length,
                errorCount: errors.length,
                errors,
                fans: insertedFans,
              },
              "Fans added successfully"
            );
          } catch (err) {
            return errorResponse(res, "Failed to save fans", 500, err);
          }
        });
    } catch (err) {
      return errorResponse(res, "Internal server error", 500, err);
    }
  }
);

// Add Fan to a Floor
router.post("/", authenticate, checkRole("SuperAdmin"), async (req, res) => {
  const { name, rpm, status, floorId } = req.body;

  if (!name) return errorResponse(res, "Fan name is required", 400);

  try {
    const existingFan = await Fan.findOne({
      name: name.trim(),
      floorId: floorId,
    });
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
          from: "floors", // collection name in MongoDB
          localField: "floorId", // field in Fan
          foreignField: "_id", // field in Floor
          as: "floorData",
        },
      },
      {
        $unwind: "$floorData", // convert array -> object
      },
      {
        $lookup: {
          from: "fanmodels",
          localField: "fanModelId",
          foreignField: "_id",
          as: "fanModelData",
        },
      },
      { $unwind: "$fanModelData" },
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
      {
        $lookup: {
          from: "fanmodels",
          localField: "fanModelId",
          foreignField: "_id",
          as: "fanModelData",
        },
      },
      { $unwind: "$fanModelData" },
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
router.put(
  "/:floorId/fans/:fanId/status",
  authenticate,
  checkRole("SuperAdmin"),
  async (req, res) => {
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
  }
);

// Update Fan Speed (RPM)
router.put(
  "/:floorId/fans/:fanId/speed",
  authenticate,
  checkRole("SuperAdmin"),
  async (req, res) => {
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
  }
);

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
      {
        $lookup: {
          from: "fanmodels",
          localField: "fanModelId",
          foreignField: "_id",
          as: "fanModelData",
        },
      },
      { $unwind: "$fanModelData" },
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

// Get all Fans by Fan Model
router.get("/model/:fanModelId", authenticate, async (req, res) => {
  const { fanModelId } = req.params;

  try {
    const fans = await Fan.aggregate([
      {
        $match: {
          fanModelId: new mongoose.Types.ObjectId(fanModelId),
        },
      },
      {
        $lookup: {
          from: "fanmodels",
          localField: "fanModelId",
          foreignField: "_id",
          as: "fanModelData",
        },
      },
      { $unwind: "$fanModelData" },
      {
        $lookup: {
          from: "floors",
          localField: "floorId",
          foreignField: "_id",
          as: "floorData",
        },
      },
      { $unwind: "$floorData" },
    ]);

    if (!fans || fans.length === 0) {
      return errorResponse(res, "No fans found for this model", 404);
    }

    return successResponse(
      res,
      fans,
      "Fans fetched successfully by fan model"
    );
  } catch (err) {
    return errorResponse(res, "Internal server error", 500, err);
  }
});


export default router;
