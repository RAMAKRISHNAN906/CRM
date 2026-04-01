import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  MANAGER: 60,
  SALES_REP: 40,
  SUPPORT: 40,
  USER: 20,
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, 'Insufficient permissions', 403);
      return;
    }
    next();
  };
};

export const requireMinRole = (minRole: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    if (userLevel < requiredLevel) {
      sendError(res, 'Insufficient permissions', 403);
      return;
    }
    next();
  };
};

export const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN');
export const requireManagerOrAdmin = requireRole('ADMIN', 'SUPER_ADMIN', 'MANAGER');
export const requireSupportOrAbove = requireMinRole('SUPPORT');
