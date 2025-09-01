// src/routes/roles.ts
import { Router } from "express";
import Role from "../schema/roleSchema";
import { errorResponse, successResponse } from "../utils/responseHandler";
import { AuthenticatedRequest } from "../types";
import { authenticate, checkRole } from "../middleware/auth";
const router = Router();

/**
 * GET All Roles
 * Accessible by all authenticated users
 */
router.get("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const roles = await Role.find(); // fetch all roles

    successResponse(res, roles, "Roles fetched successfully.");
  } catch (err: any) {
    console.error("Error fetching roles:", err.message);
    errorResponse(res, "Internal server error.", 500, err);
  }
});

/**
 * GET Role by ID
 * Accessible by all authenticated users
 */
router.get("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  const roleId = req.params.id;

  try {
    const role = await Role.findById(roleId);

    if (!role) {
      return errorResponse(res, "Role not found.", 404);
    }

    successResponse(res, role, "Role fetched successfully.");
  } catch (err: any) {
    console.error(`Error fetching role ${roleId}:`, err.message);
    errorResponse(res, "Internal server error.", 500, err);
  }
});

/**
 * POST Create Role
 * Only accessible by global_admin
 */
router.post(
  "/",
  authenticate,
  checkRole("SuperAdmin"),
  async (req: AuthenticatedRequest, res) => {
    const { name ,permissions } = req.body;

    if (!name) {
      return errorResponse(res, "Name is required to create a role.", 400);
    }

    try {
      // Check for duplicate
      const existingRole = await Role.findOne({
        name: new RegExp(`^${name}$`, "i"),
      }); // case-insensitive
      if (existingRole) {
        return errorResponse(res, "A role with this name already exists.", 409);
      }

      const newRole = new Role({
        name,
        permissions: permissions || {}, // use provided permissions or default {}
      });

      await newRole.save();

      successResponse(res, newRole, "Role created successfully.", 201);
    } catch (err: any) {
      console.error("Error creating role:", err.message);
      errorResponse(res, "Internal server error.", 500, err);
    }
  }
);

/**
 * PUT Update Role by ID
 * Only accessible by global_admin
 */
router.put(
  "/:id",
  authenticate,
  checkRole("SuperAdmin"),
  async (req: AuthenticatedRequest, res) => {
    const roleId = req.params.id;
    const { name ,permissions } = req.body;

    if (!name) {
      return errorResponse(res, "Name is required for update.", 400);
    }

    try {
      // Update the role
      const updatedRole = await Role.findByIdAndUpdate(
        roleId,
        { 
          ...(name && { name }), 
          ...(permissions && { permissions }) 
        },
        { new: true, runValidators: true }
      );

      // Handle case where role not found
      if (!updatedRole) {
        return errorResponse(res, `Role with ID ${roleId} not found.`, 404);
      }

      successResponse(res, updatedRole, "Role updated successfully.");
    } catch (err: any) {
      console.error(`Error updating role ${roleId}:`, err.message);
      errorResponse(res, "Internal server error.", 500, err);
    }
  }
);

/**
 * DELETE Role by ID
 * Only accessible by global_admin
 */
router.delete(
  "/:id",
  authenticate,
  checkRole("SuperAdmin"),
  async (req: AuthenticatedRequest, res) => {
    const roleId = req.params.id;

    try {
      const deletedRole = await Role.findByIdAndDelete(roleId);

      if (!deletedRole) {
        return errorResponse(res, "Role not found for deletion.", 404);
      }

      successResponse(res, deletedRole, "Role deleted successfully.");
    } catch (err: any) {
      console.error(`Error deleting role ${roleId}:`, err.message);
      errorResponse(res, "Internal server error.", 500, err);
    }
  }
);

export default router;
