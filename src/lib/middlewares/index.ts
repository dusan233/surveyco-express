import { Request, Response, NextFunction } from "express";
import { z, AnyZodObject, ZodError, ZodSchema } from "zod";
import { AppError } from "../errors";
import {
  HttpStatusCode,
  Question,
  QuestionBase,
  QuestionType,
} from "../../types/types";
import {
  multiChoiceQuestionSchema,
  questionSchema,
  saveMultiChoiceQuestionSchema,
} from "../../app/quizzes/api/schemaValidation";

export const validate =
  (schema: ZodSchema, originalBody: boolean = false) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(req.body);
      const dta = await schema.parseAsync(req.body);
      if (!originalBody) {
        req.body = dta;
      }
      return next();
    } catch (error: any) {
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
  req: Request<any, any, { data: Question; pageId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log(req.body, "extendo");
    if (req.body.data.type !== QuestionType.textbox) {
      await saveMultiChoiceQuestionSchema.parseAsync(req.body);
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
