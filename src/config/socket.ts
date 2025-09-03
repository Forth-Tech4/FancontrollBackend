// socket.js
import { Server } from "socket.io";
import { updateFanSpeed } from "../services/fancontroll";
interface UpdateFanSpeedPayload {
  floorId: string;
  fanId: string;
  rpm: number;
}

export const initSocket = (server:any) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // replace with frontend URL
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket:any) => {
    console.log("User connected:", socket.id);

socket.on("updateFanSpeed", async ({ floorId, fanId, rpm }: UpdateFanSpeedPayload) => {
      try {
        const fan = await updateFanSpeed(floorId, fanId, rpm);

        // Notify all clients with updated fan info
        io.emit("fanUpdated", fan);
      } catch (err:any) {
        socket.emit("errorMessage", { message: err.message });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};
