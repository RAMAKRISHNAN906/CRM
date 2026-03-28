import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../utils/jwt';
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map