// schema/floorSchema.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IFloor extends Document {
  name: string;
  file: string;
}

const floorSchema = new Schema<IFloor>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    file: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IFloor>("floor", floorSchema);
