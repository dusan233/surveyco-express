import { AppError } from "../../../lib/errors";
import { HttpStatusCode, UserParams } from "../../../types/types";
import { Request, Response } from "express";

const getUserSurveysHandler = async (
  req: Request<UserParams, any, never, { page?: string; sort?: string }>,
  res: Response
) => {
  const userId = req.params.userId;
  const authUserId = req.auth.userId;
  const page = Number(req.query.page);
  const pageNum = isNaN(page) ? 1 : page;

  if (userId !== authUserId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );
};
