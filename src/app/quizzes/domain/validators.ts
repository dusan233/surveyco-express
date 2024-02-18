import { AppError } from "../../../lib/error-handling";
import { CreateSurveyData, HttpStatusCode } from "../../../types/types";
import { createQuizSchema } from "../api/schemaValidation";

export const validateNewSurvey = (newSurvey: CreateSurveyData) => {
  try {
    const data = createQuizSchema.parse(newSurvey);
    return data;
  } catch (err) {
    throw new AppError(
      "BadRequest",
      "Invalid arguments for survey creation",
      HttpStatusCode.BAD_REQUEST
    );
  }
};
