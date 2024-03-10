import {
  assertCollectorExists,
  validateCreateCollector,
  validateUpdateCollectorName,
  validateUpdateCollectorStatus,
} from "./validators";
import * as surveyRepository from "@/app/quizzes/data-access/survey-repository";
import * as collectorRepository from "../data-access/collectors.repository";
import {
  assertSurveyExists,
  assertUserCreatedSurvey,
} from "@/app/quizzes/domain/validators";
import { UpdateCollectorDTO } from "@/types/types";

export const createSurveyCollector = async (
  collectorData: unknown,
  userId: string
) => {
  const validatedCollectorData = validateCreateCollector(collectorData);

  const survey = await surveyRepository.getSurveyById(
    validatedCollectorData.surveyId
  );

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  const newCollector = await collectorRepository.createCollector(
    validatedCollectorData
  );

  return newCollector;
};

export const getCollector = async (collectorId: string) => {
  const collector = await collectorRepository.getCollectorById(collectorId);
  return collector;
};

export const updateCollector = async (
  data: unknown,
  collectorId: string,
  userId: string
) => {
  const validatedData = validateUpdateCollectorName(data);
  const collector = await getCollector(collectorId);

  assertCollectorExists(collector);

  const survey = await surveyRepository.getSurveyById(collector!.surveyId);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  const updateCollectorData: UpdateCollectorDTO = {
    ...validatedData,
    collectorId,
  };

  return await collectorRepository.updateCollector(updateCollectorData);
};

export const updateCollectorStatus = async (
  data: unknown,
  collectorId: string,
  userId: string
) => {
  const validatedData = validateUpdateCollectorStatus(data);
  const collector = await getCollector(collectorId);

  assertCollectorExists(collector);

  const survey = await surveyRepository.getSurveyById(collector!.surveyId);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  const updateCollectorData: UpdateCollectorDTO = {
    ...validatedData,
    collectorId,
  };

  return await collectorRepository.updateCollector(updateCollectorData);
};

export const deleteSurveyCollector = async (
  collectorId: string,
  userId: string
) => {
  const collector = await getCollector(collectorId);

  assertCollectorExists(collector);

  const survey = await surveyRepository.getSurveyById(collector!.surveyId);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  return await collectorRepository.deleteCollector(collectorId);
};
