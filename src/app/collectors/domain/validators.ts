import { AppError } from "../../../lib/error-handling";
import {
  CreateCollectorData,
  HttpStatusCode,
  UpdateCollectorNameData,
  UpdateCollectorStatusData,
} from "../../../types/types";
import {
  createSurveyCollectorSchema,
  updateSurveyCollectorSchema,
  updateSurveyCollectorStatusSchema,
} from "../api/schemaValidation";

export const validateCreateCollector = (newSurvey: CreateCollectorData) => {
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

export const validateUpdateCollectorStatus = (
  collectorData: UpdateCollectorStatusData
) => {
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

export const validateUpdateCollectorName = (
  collectorData: UpdateCollectorNameData
) => {
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
