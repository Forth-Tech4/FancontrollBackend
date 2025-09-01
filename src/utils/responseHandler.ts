// src/utils/responseHandler.ts
import { Response } from 'express';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    statusCode?: number;
}

export const successResponse = <T>(res: Response, data: T, message: string = 'Success', statusCode: number = 200) => {
    res.status(statusCode).json({
        success: true,
        data,
        message,
        statusCode
    } as ApiResponse<T>);
};

export const errorResponse = (res: Response, message: string = 'An error occurred', statusCode: number = 500, errorDetails?: any) => {
    res.status(statusCode).json({
        success: false,
        message,
        error: errorDetails ? JSON.stringify(errorDetails) : message,
        statusCode
    } as ApiResponse<any>);
};