import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

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

export const requireAdmin = requireRole('ADMIN');
export const requireManagerOrAdmin = requireRole('ADMIN', 'MANAGER');
