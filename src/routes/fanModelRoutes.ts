import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import Fanmodel from "../schema/fanModelSchema"
import { errorResponse, successResponse } from "../utils/responseHandler";
import { authenticate, checkRole } from "../middleware/auth";
const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Upload CSV of Fan Model Registers
router.post(
  "/upload-fanmodel",
  authenticate,
  checkRole("SuperAdmin"),
  upload.single("file"),
  async (req: any, res) => {
    try {
      if (!req.file) return errorResponse(res, "No file uploaded", 400);

      const { ipAddress, port, totalDevices } = req.body;
      if (!ipAddress || !port || !totalDevices) {
        return errorResponse(res, "Missing ipAddress, port or totalDevices", 400);
      }
    const existingModel = await Fanmodel.findOne({
      ipAddress,
      port
        });

    if (existingModel) {
      fs.unlinkSync(req.file.path);
      return errorResponse(res, "Fan model details already exist", 400, {
        ipAddress,
        port,
        totalDevices,
      });
    }

      const results: any[] = [];
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

          const register = row["Holding register"];
          const description = row["Description"];
          const access = row["Read/Write"];
          const valueRange = row["Value"];

          if (!register || !description || !access || !valueRange) {
            errors.push({
              row: rowIndex,
              rowData: row,
              error: "Missing required fields",
            });
            return;
          }

          // ✅ Prevent duplicate register numbers inside the same CSV
          if (results.find((r) => r.register === Number(register))) {
            errors.push({
              row: rowIndex,
              register,
              error: "Duplicate register number in CSV",
            });
            return;
          }

          results.push({
            register: Number(register),
            description,
            access,
            valueRange,
          });
        })
        .on("end", async () => {
          try {
            let fanModel = null;

            if (results.length > 0) {
              fanModel = await Fanmodel.create({
                ipAddress,
                port,
                totalDevices,
                registers: results,
              });
            }

            fs.unlinkSync(req.file.path);

            return successResponse(
              res,
              {
                insertedCount: results.length,
                errorCount: errors.length,
                errors,
                fanModel,
              },
              "Fan Model CSV processed"
            );
          } catch (err) {
            fs.unlinkSync(req.file.path);
            return errorResponse(res, "Failed to save Fan Model", 500, err);
          }
        });
    } catch (err) {
      return errorResponse(res, "Internal server error", 500, err);
    }
  }
);

// Get All Fan Models
router.get(
  "/",
  authenticate,
  async (req, res) => {
    try {
      const fanModels = await Fanmodel.find().lean();

      if (!fanModels || fanModels.length === 0) {
        return errorResponse(res, "No fan models found", 404);
      }

      return successResponse(res, fanModels, "All fan models fetched successfully");
    } catch (err) {
      return errorResponse(res, "Internal server error", 500, err);
    }
  }
);

export default router;
