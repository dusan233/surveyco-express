import { AppError } from "../../../lib/errors";
import { HttpStatusCode, UserParams } from "../../../types/types";
import { Request, Response } from "express";
import { getUserSurveyCount, getUserSurveys } from "../domain/services";

const getUserSurveysHandler = async (
  req: Request<UserParams, any, never, { page?: string; sort?: string }>,
  res: Response
) => {
  const userId = req.params.userId;
  const authUserId = req.auth.userId;
  const page = Number(req.query.page);
  const pageNum = isNaN(page) ? 1 : page;

  const sort: { column: string; type: "asc" | "desc" } = req.query.sort
    ? {
        column: req.query.sort.split(":")[0],
        type: req.query.sort.split(":")[1] as "asc" | "desc",
      }
    : { column: "updated_at", type: "desc" };

  if (userId !== authUserId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const [surveys, surveyCount] = await Promise.all([
    getUserSurveys(authUserId, pageNum, sort),
    getUserSurveyCount(authUserId),
  ]);

  return res.status(HttpStatusCode.OK).json({
    data: surveys.map((survey) => ({
      id: survey.id,
      title: survey.title,
      creatorId: survey.creatorId,
      updated_at: survey.updated_at,
      created_at: survey.created_at,
      category: survey.category,
      question_count: survey._count.questions,
      responses_count: survey._count.surveyResponses,
      page_count: survey._count.surveyPages,
    })),
    total_pages: Math.ceil(surveyCount / 30),
  });
};

export default {
  getUserSurveysHandler,
};
