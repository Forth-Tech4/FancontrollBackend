// schema/layoutSchema.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ILayout extends Document {
  floorId: mongoose.Types.ObjectId; // reference to floor
  file: string;
  meta: any; // JSON field
}

const layoutSchema = new Schema<ILayout>(
  {
    floorId: { type: Schema.Types.ObjectId, ref: "floor", required: true },
    file: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model<ILayout>("layout", layoutSchema);
