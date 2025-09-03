import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";   // ✅ import cors
import connectDB from "./config/db";
import authRoutes from "./routes/authRoutes";
import roleRoutes from "./routes/roleRoutes";
import floorRoutes from "./routes/floorRoutes";
import fanModelRoutes from "./routes/fanModelRoutes";
import fanRoutes from "./routes/fanRoutes";
import http from "http";
import { initSocket } from "./config/socket";
dotenv.config();
const app: Application = express();
const PORT = process.env.PORT||5000;

app.use(cors())

app.get("/", (req, res) => {
  res.status(200).json({
    message: "✅ Welcome to the API! Server is running smoothly 🚀",
    docs: "/docs", // you can later point this to swagger/docs
  });
});

// Middleware
app.use(express.json());
const server = http.createServer(app);

// // Routes
app.use("/auth", authRoutes);
app.use("/role", roleRoutes);
app.use("/floor", floorRoutes);
app.use("/fan", fanRoutes);
app.use("/fanmodel", fanModelRoutes);

initSocket(server);

// Start Server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
