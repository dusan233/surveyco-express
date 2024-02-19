import { Request, Response } from "express";
import {
  CollectorParams,
  CreateCollectorData,
  HttpStatusCode,
  UpdateCollectorRequestBody,
  UpdateCollectorStatusRequestBody,
} from "../../../types/types";
import { AppError as AppErr } from "../../../lib/error-handling/index";
import { updateSurveyCollectorStatus } from "../domain/services";
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

  const updatedCollector = await updateSurveyCollectorStatus(
    req.body,
    collectorId,
    userId
  );

  return res.status(HttpStatusCode.OK).json(updatedCollector);
};

const deleteSurveyCollectorHandler = async (
  req: Request<CollectorParams>,
  res: Response
) => {
  const userId = req.auth.userId;
  const collectorId = req.params.collectorId;

  await collectorService.deleteSurveyCollector(collectorId, userId);

  return res.sendStatus(HttpStatusCode.NO_CONTENT);
};

const updateSurveyCollectorHandler = async (
  req: Request<CollectorParams, never, UpdateCollectorRequestBody>,
  res: Response
) => {
  const userId = req.auth.userId;
  const collectorId = req.params.collectorId;

  const updatedCollector = await collectorService.updateSurveyCollector(
    req.body,
    collectorId,
    userId
  );

  return res.status(HttpStatusCode.OK).json(updatedCollector);
};

const getSurveyCollectorHandler = async (
  req: Request<CollectorParams>,
  res: Response
) => {
  const collectorId = req.params.collectorId;

  const collector = await collectorService.getSurveyCollector(collectorId);

  if (!collector)
    throw new AppErr(
      "NotFound",
      "Resource not found.",
      HttpStatusCode.NOT_FOUND,
      true
    );

  return res.status(HttpStatusCode.OK).json(collector);
};

export default {
  createSurveyCollectorHandler,
  getSurveyCollectorHandler,
  deleteSurveyCollectorHandler,
  updateSurveyCollectorStatusHandler,
  updateSurveyCollectorHandler,
};
