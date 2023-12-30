import { NextFunction, Request, Response } from "express";
import { getSurvey } from "../../quizzes/domain/services";
import {
  CollectorParams,
  CollectorType,
  HttpStatusCode,
  SurveyParams,
} from "../../../types/types";
import { AppError } from "../../../lib/errors";
import {
  createSurveyCollector,
  deleteSurveyCollector,
  getSurveyCollector,
} from "../domain/services";

const createSurveyCollectorHandler = async (
  req: Request<never, never, { type: CollectorType; surveyId: string }>,
  res: Response,
  next: NextFunction
) => {
  const surveyId = req.body.surveyId;
  const collectorType = req.body.type;
  const userId = req.auth.userId;
  const survey = await getSurvey(surveyId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const collector = await createSurveyCollector(collectorType, surveyId);

  return res.status(HttpStatusCode.CREATED).json(collector);
};

const deleteSurveyCollectorHandler = async (
  req: Request<CollectorParams>,
  res: Response
) => {
  const userId = req.auth.userId;
  const collectorId = req.params.collectorId;

  const collector = await getSurveyCollector(collectorId);

  if (!collector)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  const survey = await getSurvey(collector.surveyId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  await deleteSurveyCollector(collectorId);

  return res.sendStatus(HttpStatusCode.NO_CONTENT);
};

const getSurveyCollectorHandler = async (
  req: Request<CollectorParams>,
  res: Response,
  next: NextFunction
) => {
  console.log("ovde sam");

  const collectorId = req.params.collectorId;

  const collector = await getSurveyCollector(collectorId);

  return res.status(HttpStatusCode.OK).json(collector);
};

export default {
  createSurveyCollectorHandler,
  getSurveyCollectorHandler,
  deleteSurveyCollectorHandler,
};
