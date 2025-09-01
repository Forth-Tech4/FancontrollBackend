import mongoose from "mongoose";

const fanSchema = new mongoose.Schema(
  {
    floorId: { type: mongoose.Schema.Types.ObjectId, ref: "floor", required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ["ON", "OFF"], default: "OFF" },
    rpm: { type: Number, default: 0 }, // Fan speed
  },
  { timestamps: true }
);

export default mongoose.model("Fan", fanSchema);
