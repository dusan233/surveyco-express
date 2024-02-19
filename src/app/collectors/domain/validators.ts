import { AppError } from "../../../lib/error-handling";
import { CreateCollectorData, HttpStatusCode } from "../../../types/types";
import { createSurveyCollectorSchema } from "../api/schemaValidation";

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
