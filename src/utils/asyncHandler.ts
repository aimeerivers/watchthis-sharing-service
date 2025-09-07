import type { NextFunction, Request, Response } from "express";

/**
 * Async handler wrapper to catch errors in async route handlers
 * and pass them to Express error handling middleware
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
