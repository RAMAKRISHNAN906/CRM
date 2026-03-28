import { Request, Response, NextFunction } from 'express';
export declare const requireRole: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireManagerOrAdmin: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=rbac.middleware.d.ts.map