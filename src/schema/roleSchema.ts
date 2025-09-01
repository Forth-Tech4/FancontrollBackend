import mongoose, { Schema, Document } from "mongoose";

export interface IUserRole extends Document {
  name: string;
  permissions: Record<string, boolean>; // permissions object
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema<IUserRole> = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    permissions: {
      type: Object,
      default: {}, // empty object by default
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUserRole>("Role", RoleSchema);
