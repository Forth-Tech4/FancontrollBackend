// src/middleware/auth.ts
import { NextFunction, Response as ExpressResponse } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types";
import { errorResponse } from "../utils/responseHandler";
import User from "../schema/userSchema"
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

/**
 * Middleware: Authenticate using JWT + MongoDB
 */
const authenticate = async (
  req: AuthenticatedRequest,
  res: ExpressResponse,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return errorResponse(res, "No token provided", 401);
  }

  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    // Find user
    const user:any= await User.findById(decoded.id).populate("roleId", "name"); 
    if (!user) {
      return errorResponse(res, "User not found", 401);
    }

    // Attach user info
    req.user = {
      id: user._id.toString(),
      email: user.email,
      roles: user.roleId ? [user.roleId["name"]] : [], // Extract role name if populated
    };

    next();
  } catch (error: any) {
    console.error("Auth error:", error.message);
    return errorResponse(res, "Invalid or expired token", 401);
  }
};

/**
 * Middleware: Role Check
 */
const checkRole = (allowedRoles: string | string[]) => {
  return (req: AuthenticatedRequest, res: ExpressResponse, next: NextFunction) => {
    if (!req.user || !req.user.roles) {
      return errorResponse(res, "Authentication required for role check", 401);
    }

    const userRoles = req.user.roles;
    const rolesToCheck = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    const hasPermission = userRoles.some((role:any) => rolesToCheck.includes(role));

    if (!hasPermission) {
      return errorResponse(
        res,
        `Insufficient permissions. Required: ${rolesToCheck.join(", ")}`,
        403
      );
    }

    next();
  };
};

export { authenticate, checkRole };
