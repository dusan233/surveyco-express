import { Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";

export const asyncHandler =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

    (function_: any) =>
    (request: Request, response: Response, next: NextFunction) => {
      Promise.resolve(function_(request, response, next)).catch(next);
    };

export const rateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: "Too many requests! Please try again in a bit.",
  standardHeaders: true,
  legacyHeaders: false,
});
