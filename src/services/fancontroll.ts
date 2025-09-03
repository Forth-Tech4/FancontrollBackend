// services/fanService.js
import Fan from "../schema/fanSchema"

/**
 * Update fan speed by fanId and floorId
 */
export const updateFanSpeed = async (floorId: string, fanId: string, rpm: number) => {
  if (rpm === undefined) {
    throw new Error("RPM is required");
  }

  const status = rpm > 0 ? "ON" : "OFF";

  const fan = await Fan.findOneAndUpdate(
    { _id: fanId, floorId },
    { rpm, status },
    { new: true }
  );

  if (!fan) {
    throw new Error("Fan not found");
  }

  return fan;
};
