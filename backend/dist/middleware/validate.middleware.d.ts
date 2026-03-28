import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
export declare const validate: (schema: ZodSchema, source?: "body" | "query" | "params") => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validate.middleware.d.ts.map