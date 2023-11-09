import { Request, Response, NextFunction } from "express";
import { z, AnyZodObject, ZodError } from "zod";
import { AppError } from "../errors";
import { HttpStatusCode, QuestionBase, QuestionType } from "../../types/types";
import {
  multiChoiceQuestionSchema,
  questionSchema,
} from "../../app/quizzes/api/schemaValidation";

export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(req.body);
      await schema.parseAsync(req.body);
      return next();
    } catch (error: any) {
      console.log(error, "provera ovde");
      if (error instanceof ZodError) {
        return next(
          new AppError("", "Invalid data", HttpStatusCode.BAD_REQUEST, "", true)
        );
      } else {
        return next(
          new AppError(
            "",
            "Something went wrong.",
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            "",
            false
          )
        );
      }
    }
  };

export const validateQuestionType = async (
  req: Request<any, any, QuestionBase>,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log(req.body, "extendo");
    if (req.body.type !== QuestionType.textbox) {
      await multiChoiceQuestionSchema.parseAsync(req.body);
    }
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      return next(
        new AppError("", "Invalid data", HttpStatusCode.BAD_REQUEST, "", true)
      );
    } else {
      return next(
        new AppError(
          "",
          "Something went wrong.",
          HttpStatusCode.INTERNAL_SERVER_ERROR,
          "",
          false
        )
      );
    }
  }
};

export const asyncHandler =
  (fn: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
