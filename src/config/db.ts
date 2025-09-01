import mongoose from "mongoose";
import dotenv from "dotenv"
dotenv.config();

const connectDB = async () => {
  try {
    const url = process.env.MONGO_URL  ||  "mongodb://localhost:27017/fancontrollu"
    await mongoose.connect(url as string);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
};

export default connectDB;
