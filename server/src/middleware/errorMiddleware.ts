import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const errorMiddleware = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";

    logger.error(
        `${status} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip} - Stack: ${err.stack}`,
    );

    res.status(status).json({
        error: process.env.NODE_ENV === "development" ? message : "Internal Server Error",
    });
};
