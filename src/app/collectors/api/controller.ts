import { Request, Response } from "express";
import { CollectorParams, HttpStatusCode } from "../../../types/types";
import { AppError as AppErr } from "../../../lib/error-handling/index";
import * as collectorUseCase from "../domain/collector-use-case";

const createSurveyCollectorHandler = async (req: Request, res: Response) => {
  const userId = req.auth.userId;

  const collector = await collectorUseCase.createSurveyCollector(
    req.body,
    userId
  );

  return res.status(HttpStatusCode.CREATED).json(collector);
};

const updateSurveyCollectorStatusHandler = async (
  req: Request<CollectorParams>,
  res: Response
) => {
  const userId = req.auth.userId;
  const collectorId = req.params.collectorId;

  const updatedCollector = await collectorUseCase.updateCollectorStatus(
    req.body,
    collectorId,
    userId
  );

  return res.status(HttpStatusCode.OK).json(updatedCollector);
};

const deleteCollectorHandler = async (
  req: Request<CollectorParams>,
  res: Response
) => {
  const userId = req.auth.userId;
  const collectorId = req.params.collectorId;

  await collectorUseCase.deleteSurveyCollector(collectorId, userId);

  return res.sendStatus(HttpStatusCode.NO_CONTENT);
};

const updateSurveyCollectorHandler = async (
  req: Request<CollectorParams>,
  res: Response
) => {
  const userId = req.auth.userId;
  const collectorId = req.params.collectorId;

  const updatedCollector = await collectorUseCase.updateCollector(
    req.body,
    collectorId,
    userId
  );

  return res.status(HttpStatusCode.OK).json(updatedCollector);
};

const getCollectorHandler = async (
  req: Request<CollectorParams>,
  res: Response
) => {
  const collectorId = req.params.collectorId;

  const collector = await collectorUseCase.getCollector(collectorId);

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
  getCollectorHandler,
  deleteCollectorHandler,
  updateSurveyCollectorStatusHandler,
  updateSurveyCollectorHandler,
};
