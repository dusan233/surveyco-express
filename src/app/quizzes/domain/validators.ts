import { AppError } from "../../../lib/error-handling";
import { CreateSurveyData, HttpStatusCode } from "../../../types/types";
import {
  createQuizSchema,
  surveyCollectorsQueryParamsSchema,
  surveyResponsesQueryParamsSchema,
} from "../api/schemaValidation";
import { SurveyRecord } from "../data-access/survey-repository";

export const validateNewSurvey = (newSurvey: CreateSurveyData) => {
  try {
    const data = createQuizSchema.parse(newSurvey);
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

export const assertSurveyExists = (survey: SurveyRecord | null) => {
  if (!survey)
    throw new AppError(
      "NotFound",
      "Resource not found.",
      HttpStatusCode.NOT_FOUND,
      true
    );
};

export const assertUserCreatedSurvey = (
  survey: SurveyRecord,
  userId: string
) => {
  if (survey.creatorId !== userId)
    throw new AppError(
      "Unauthorized",
      "Unauthorized access.",
      HttpStatusCode.UNAUTHORIZED,
      true
    );
};

export const validateSurveyResponsesQueryParams = (queryParams: {
  [key: string]: string;
}) => {
  try {
    const validatedQParams =
      surveyResponsesQueryParamsSchema.parse(queryParams);
    return validatedQParams;
  } catch (err) {
    console.log(err);
    throw new AppError(
      "BadRequest",
      "Invalid inputs.",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  }
};

export const validateSurveyCollectorsQueryParams = (queryParams: {
  [key: string]: string;
}) => {
  try {
    const validatedQParams =
      surveyCollectorsQueryParamsSchema.parse(queryParams);
    return validatedQParams;
  } catch (err) {
    console.log(err);
    throw new AppError(
      "BadRequest",
      "Invalid inputs.",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  }
};
