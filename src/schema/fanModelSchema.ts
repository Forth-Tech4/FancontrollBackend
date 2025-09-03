import mongoose from "mongoose";

const fanModelSchema = new mongoose.Schema(
  {
    ipAddress: { type: String, required: true },
    port: { type: Number, required: true },
    totalDevices: { type: Number, required: true },

    registers: [
      {
        register: { type: Number, required: true }, // Holding register
        description: { type: String, required: true },
        access: {
          type: String,
          enum: ["Read", "Write", "Read/Write"],
          required: true,
        },
        valueRange: { type: String, required: true }, // Example: "0-100"
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Fanmodel", fanModelSchema);
