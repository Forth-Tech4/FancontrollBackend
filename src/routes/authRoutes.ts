import express from "express";
import User from "../schema/userSchema";
import Role from "../schema/roleSchema";
import { errorResponse, successResponse } from "../utils/responseHandler";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { emailService } from "../services/emailServices";
import { generateOtp } from "../utils/utils";

const router = express.Router();

// REGISTER API
router.post("/register", async (req, res) => {
  const { username, email, password, confirmPassword, role } = req.body;

  try {
    if (!username || !email || !password || !confirmPassword) {
      return errorResponse(res, "All fields are required.", 400);
    }

    if (password !== confirmPassword) {
      return errorResponse(res, "Passwords do not match.", 400);
    }

    const findEmail = await User.find({ email: email });

    if (findEmail.length > 0) {
      return errorResponse(res, "User email is alredy there.", 400);
    }

    const userData = await User.find({ username: username });

    if (userData.length > 0) {
      return errorResponse(res, "UserName already exists.", 400);
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    let roleName = null;
    if (role) {
      roleName = await Role.findOne({ name: role });
      if (!roleName) {
        return res.status(400).json({ message: "Invalid role" });
      }
    }

    const user = new User({
      username,
      email,
      password: hashedPassword,
      roleId: roleName ? roleName._id : undefined,
    });

    await user.save();

    successResponse(
      res,
      {
        data: user,
        message: "User registered successfully.",
      },
      "User registered successfully.",
      201
    );
  } catch (error) {
    console.log(error);
    errorResponse(
      res,
      "Internal server error during registration.",
      500,
      error
    );
  }
});

// LOGIN API (optional in same route file)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, "Email and password are required.", 400);
    }

    // Find user and populate role
    const user = await User.findOne({ email }).populate("roleId");
    if (!user) return errorResponse(res, "User not found.", 404);

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return errorResponse(res, "Invalid password.", 401);

    // Generate JWT tokens
    const access_token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    const refresh_token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const expires_in = 24 * 60 * 60; // 1 day in seconds
    const expires_at = new Date(Date.now() + expires_in * 1000);
    // Get user roles
    const userRoles = user.roleId ? [(user.roleId as any).name] : [];

    // Send success response
    return successResponse(
      res,
      {
        user: {
          id: user._id,
          email: user.email,
          roles: userRoles,
        },
        access_token,
        refresh_token,
        expires_at,
        expires_in,
      },
      "User logged in successfully"
    );
  } catch (error: any) {
    console.error(error);
    return errorResponse(
      res,
      "Internal server error during login.",
      500,
      error
    );
  }
});

// User Forgot Password Otp Api
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) return errorResponse(res, "Email is required.", 400);

  try {
    const user = await User.findOne({ email });

    if (!user) return errorResponse(res, "Email not found.", 404);

    const otp:any = await generateOtp(6)
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 2);

    user.otp = otp;
    user.otp_expiry_time = expiry;
    await user.save();

    await emailService.sendForgotPasswordEmail({
      to: email,
      email,
      otp,
    });

    return successResponse(
      res,
      { message: "OTP sent successfully to your email" },
      "OTP sent successfully."
    );
  } catch (err: any) {
    console.error(err);
    return errorResponse(res, "Internal server error.", 500, err);
  }
});

// User Resend Otp Api
router.post("/resend-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) return errorResponse(res, "Email is required.", 400);

  try {
    const user = await User.findOne({ email });
    if (!user) return errorResponse(res, "Email not found.", 404);

    const otp:any= await generateOtp(6)
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 2);

    user.otp = otp;
    user.otp_expiry_time = expiry;
    await user.save();

    await emailService.sendResendOtpEmail({ to: email, email, otp });

    return successResponse(
      res,
      { message: "OTP resent successfully to your email" },
      "OTP resent successfully."
    );
  } catch (err: any) {
    console.error(err);
    return errorResponse(res, "Internal server error.", 500, err);
  }
});

// User Verify Otp Api
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return errorResponse(res, "Email and OTP are required.", 400);

  try {
    const user = await User.findOne({ email });
    if (!user) return errorResponse(res, "Email not found.", 404);

    if (!user.otp || user.otp !== otp)
      return errorResponse(res, "Invalid OTP.", 400);

    const now = new Date();
    if (now.getTime() > (user.otp_expiry_time?.getTime() || 0))
      return errorResponse(res, "OTP expired.", 400);

    user.otp = null;
    user.otp_expiry_time = null;
    await user.save();

    return successResponse(
      res,
      { message: "OTP verified successfully", email },
      "OTP verified successfully."
    );
  } catch (err: any) {
    console.error(err);
    return errorResponse(res, "Internal server error.", 500, err);
  }
});

// User Reset Password Api
router.post("/reset-password", async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  if (!email || !newPassword || !confirmPassword) {
    return errorResponse(res, "Email, newPassword and confirmPassword are required.", 400);
  }

  if (newPassword !== confirmPassword) {
    return errorResponse(res, "Passwords do not match.", 400);
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return errorResponse(res, "User not found.", 404);

    // Ensure OTP was verified before allowing reset
    if (user.otp !== null || user.otp_expiry_time !== null) {
      return errorResponse(
        res,
        "Please verify OTP before resetting password.",
        400
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    return successResponse(
      res,
      { message: "Password reset successfully. You can now log in." },
      "Password reset successfully."
    );
  } catch (err: any) {
    console.error(err);
    return errorResponse(res, "Internal server error.", 500, err);
  }
});


export default router;
