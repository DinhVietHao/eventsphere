import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from './AppError';
import { appConfig } from '../../config/app.config';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  if (appConfig.nodeEnv === 'development') {
    console.error(`[Error]: ${err.stack}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(appConfig.nodeEnv === 'development' && { stack: err.stack })
  });
};