import {
  CreateCollectorData,
  HttpStatusCode,
  UpdateCollectorNameData,
  UpdateCollectorStatusData,
} from "../../../types/types";
import * as surveyService from "../../quizzes/domain/services";
import * as collectorRepository from "../data-access/collectors.repository";
import {
  assertSurveyExists,
  assertUserCreatedSurvey,
} from "../../quizzes/domain/validators";
import {
  validateCreateCollector,
  validateUpdateCollectorName,
  validateUpdateCollectorStatus,
} from "./validators";
import { AppError } from "../../../lib/error-handling";

export const createSurveyCollector = async (
  collectorData: CreateCollectorData,
  userId: string
) => {
  const validatedCollectorData = validateCreateCollector(collectorData);

  const survey = await surveyService.getSurveyById(
    validatedCollectorData.surveyId
  );

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  const newCollector = await collectorRepository.createCollector(
    validatedCollectorData
  );

  return newCollector;
};

export const deleteSurveyCollector = async (
  collectorId: string,
  userId: string
) => {
  const collector = await getSurveyCollector(collectorId);

  if (!collector)
    throw new AppError(
      "NotFound",
      "Resource not found.",
      HttpStatusCode.NOT_FOUND,
      true
    );

  const survey = await surveyService.getSurvey(collector.surveyId);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  return await collectorRepository.deleteCollector(collectorId);
};

export const updateSurveyCollector = async (
  data: UpdateCollectorNameData,
  collectorId: string,
  userId: string
) => {
  const validatedData = validateUpdateCollectorName(data);
  const collector = await getSurveyCollector(collectorId);

  if (!collector)
    throw new AppError(
      "NotFound",
      "Resource not found.",
      HttpStatusCode.NOT_FOUND,
      true
    );

  const survey = await surveyService.getSurvey(collector.surveyId);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  return await collectorRepository.updateCollector(validatedData, collectorId);
};

export const updateSurveyCollectorStatus = async (
  data: UpdateCollectorStatusData,
  collectorId: string,
  userId: string
) => {
  const validatedData = validateUpdateCollectorStatus(data);
  const collector = await getSurveyCollector(collectorId);

  if (!collector)
    throw new AppError(
      "NotFound",
      "Resource not found.",
      HttpStatusCode.NOT_FOUND,
      true
    );

  const survey = await surveyService.getSurvey(collector.surveyId);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  return await collectorRepository.updateCollector(validatedData, collectorId);
};

export const getSurveyCollector = async (collectorId: string) => {
  const collector = await collectorRepository.getCollectorById(collectorId);
  return collector;
};
