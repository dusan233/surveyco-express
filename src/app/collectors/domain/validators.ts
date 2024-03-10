import { AppError } from "../../../lib/error-handling";
import {
  CollectrorRecord,
  CreateCollectorData,
  HttpStatusCode,
  UpdateCollectorNameData,
  UpdateCollectorStatusData,
} from "../../../types/types";
import { SurveyRecord } from "../../quizzes/data-access/survey-repository";
import {
  createSurveyCollectorSchema,
  updateSurveyCollectorSchema,
  updateSurveyCollectorStatusSchema,
} from "./schema-validation";

export const validateCreateCollector = (newSurvey: unknown) => {
  try {
    const data = createSurveyCollectorSchema.parse(newSurvey);
    return data;
  } catch (err) {
    throw new AppError(
      "BadRequest",
      "Invalid arguments for survey creation",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  }
};

export const assertCollectorExists = (collector: CollectrorRecord | null) => {
  if (!collector)
    throw new AppError(
      "NotFound",
      "Resource not found.",
      HttpStatusCode.NOT_FOUND,
      true
    );
};

export const assertCollectorBelongsToSurvey = (
  survey: SurveyRecord,
  collector: CollectrorRecord
) => {
  if (collector.surveyId !== survey.id)
    throw new AppError(
      "BadRequest",
      "Invalid inputs.",
      HttpStatusCode.BAD_REQUEST,
      true
    );
};

export const validateUpdateCollectorStatus = (collectorData: unknown) => {
  try {
    const data = updateSurveyCollectorStatusSchema.parse(collectorData);
    return data;
  } catch (err) {
    throw new AppError(
      "BadRequest",
      "Invalid arguments for survey creation",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  }
};

export const validateUpdateCollectorName = (collectorData: unknown) => {
  try {
    const data = updateSurveyCollectorSchema.parse(collectorData);
    return data;
  } catch (err) {
    throw new AppError(
      "BadRequest",
      "Invalid arguments for survey creation",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  }
};
