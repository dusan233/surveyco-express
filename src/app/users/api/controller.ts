import { HttpStatusCode, UserParams } from "@/types/types";
import { Request, Response } from "express";
import { AppError } from "@/lib/error-handling";
import { validateUserSurveysQueryParams } from "../domain/validators";
import * as userUseCase from "../domain/user-use-case";

const getUserSurveysHandler = async (
  req: Request<UserParams, any, never, { page?: string; sort?: string }>,
  res: Response
) => {
  const userId = req.params.userId;
  const authUserId = req.auth.userId;

  const validatedQueryParams = validateUserSurveysQueryParams(req.query);

  if (userId !== authUserId)
    throw new AppError(
      "Unauthorized",
      "User has no access to this.",
      HttpStatusCode.UNAUTHORIZED,
      true
    );

  const data = await userUseCase.getUserSurveys(
    userId,
    validatedQueryParams.page,
    validatedQueryParams.sort
  );
  return res.status(HttpStatusCode.OK).json(data);
};

export default {
  getUserSurveysHandler,
};
