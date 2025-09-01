import mongoose, { Schema, Document } from "mongoose";
// import bcrypt from "bcrypt";   // ✅ no require
// import jwt from "jsonwebtoken";   // ✅ no require

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  roleId?: mongoose.Types.ObjectId;
  otp?: string | null;
  otp_expiry_time?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Please add a password."],
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
    otp: { type: String, default: null },
    otp_expiry_time: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// /** 🔑 Encrypting the Password before saving */
// UserSchema.pre<IUser>("save", async function (next) {
//   if (!this.isModified("password")) return next(); // only hash if modified
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// /** 🔑 Method to compare password */
// UserSchema.methods.comparePassword = async function (
//   enteredPassword: string
// ): Promise<boolean> {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// /** 🔑 Generate JWT Token */
// UserSchema.methods.generateAndSaveToken = function (): string {
//   return jwt.sign({ id: this._id }, process.env.JWT_SECRET as string, {
//     expiresIn: "1d",
//   });
// };

export default mongoose.model<IUser>("User", UserSchema);
