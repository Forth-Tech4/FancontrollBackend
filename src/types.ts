import { Request } from "express";

interface AuthUser {
  id: string;
  email: string | undefined;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
