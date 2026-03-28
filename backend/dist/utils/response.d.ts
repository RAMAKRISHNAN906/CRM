import { Response } from 'express';
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
    errors?: any[];
}
export declare const sendSuccess: <T>(res: Response, data: T, message?: string, statusCode?: number, meta?: ApiResponse["meta"]) => void;
export declare const sendError: (res: Response, message: string, statusCode?: number, errors?: any[]) => void;
export declare const sendPaginated: <T>(res: Response, data: T[], total: number, page: number, limit: number, message?: string) => void;
//# sourceMappingURL=response.d.ts.map