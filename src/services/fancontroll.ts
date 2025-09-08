// services/fanService.js
import Fan from "../schema/fanSchema";
import Floor from "../schema/floorSchema";
/**
 * Update fan speed by fanId and floorId
 */
export const updateFanSpeed = async (
  floorId: string,
  fanId: string,
  rpm: number
) => {
  try {
    const floor = await Floor.findById(floorId);
    if (!floor) {
      return {
        success: false,
        message: `Floor with id ${floorId} not found`,
        total: 0,
        successCount: 0,
        errorCount: 0,
        results: [],
      };
    }

    if (rpm === undefined) {
      return {
        success: false,
        message: "RPM is required",
      };
    }

    const status = rpm > 0 ? "ON" : "OFF";

    const fan = await Fan.findOneAndUpdate(
      { _id: fanId, floorId },
      { rpm, status },
      { new: true }
    );

    console.log("✅ Fan update result:", fan);

    if (!fan) {
      return {
        success: false,
        message: "Fan not found",
      };
    }

    return {
      success: true,
      message: "Fan updated successfully",
      data: fan,
    };
  } catch (error: any) {
    console.error("❌ Error in updateFanSpeed:", error.message);

    return {
      success: false,
      message: error.message || "Something went wrong while updating fan speed",
    };
  }
};

/**
 * Update multiple fans in the same floor
 */
export const updateMultipleFans = async (
  floorId: string,
  fans: { fanId: string; rpm: number }[]
) => {
  // ✅ First check if floor exists
  const floor = await Floor.findById(floorId);
  if (!floor) {
    return {
      success: false,
      message: `Floor with id ${floorId} not found`,
      total: 0,
      successCount: 0,
      errorCount: 0,
      results: [],
    };
  }

  const results: {
    fanId: string;
    success: boolean;
    message: string;
    data?: any;
  }[] = [];

  for (const { fanId, rpm } of fans) {
    const result = await updateFanSpeed(floorId, fanId, rpm);
    results.push({
      fanId,
      success: result.success,
      message: result.message,
      data: result.data || null,
    });
  }

  return {
    total: fans.length,
    successCount: results.filter((r) => r.success).length,
    errorCount: results.filter((r) => !r.success).length,
    results,
  };
};
