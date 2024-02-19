import { NextFunction, Request, Response } from "express";
import { getSurvey } from "../../quizzes/domain/services";
import {
  CollectorParams,
  CollectorType,
  CreateCollectorData,
  HttpStatusCode,
  SurveyParams,
  UpdateCollectorRequestBody,
  UpdateCollectorStatusRequestBody,
} from "../../../types/types";
import { AppError } from "../../../lib/errors";
import {
  createSurveyCollector,
  deleteSurveyCollector,
  getSurveyCollector,
  updateSurveyCollector,
  updateSurveyCollectorStatus,
} from "../domain/services";
import {
  assertSurveyExists,
  assertUserCreatedSurvey,
} from "../../quizzes/domain/validators";
import * as collectorService from "../domain/services";

const createSurveyCollectorHandler = async (
  req: Request<never, never, CreateCollectorData>,
  res: Response
) => {
  const userId = req.auth.userId;

  const collector = await collectorService.createSurveyCollector(
    req.body,
    userId
  );

  return res.status(HttpStatusCode.CREATED).json(collector);
};

const updateSurveyCollectorStatusHandler = async (
  req: Request<CollectorParams, never, UpdateCollectorStatusRequestBody>,
  res: Response
) => {
  const userId = req.auth.userId;
  const collectorId = req.params.collectorId;
  const status = req.body.status;

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

  const updatedCollector = await updateSurveyCollectorStatus(
    collectorId,
    status
  );

  return res.status(HttpStatusCode.OK).json(updatedCollector);
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

const updateSurveyCollectorHandler = async (
  req: Request<CollectorParams, never, UpdateCollectorRequestBody>,
  res: Response
) => {
  const userId = req.auth.userId;
  const collectorId = req.params.collectorId;
  const updatedCollectorName = req.body.name;

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

  const updatedCollector = await updateSurveyCollector(
    updatedCollectorName,
    collectorId
  );

  return res.status(HttpStatusCode.OK).json(updatedCollector);
};

const getSurveyCollectorHandler = async (
  req: Request<CollectorParams>,
  res: Response
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
  updateSurveyCollectorStatusHandler,
  updateSurveyCollectorHandler,
};
