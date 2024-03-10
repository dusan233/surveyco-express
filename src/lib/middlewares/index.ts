import { Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";

export const asyncHandler =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fn: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const rateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: "Too many requests! Please try again in a bit.",
  standardHeaders: true,
  legacyHeaders: false,
});
