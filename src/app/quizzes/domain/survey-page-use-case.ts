import { AppError } from "../../../lib/error-handling";
import { HttpStatusCode } from "../../../types/types";
import * as surveyPageRepository from "../data-access/survey-page-repository";
import * as surveyRepository from "../data-access/survey-repository";
import { assertMaxPagesNotExceeded } from "./survey-page-validators";
import { assertSurveyExists, assertUserCreatedSurvey } from "./validators";

export const createSurveyPage = async (surveyId: string, userId: string) => {
  const [survey, pageCount] = await Promise.all([
    surveyRepository.getSurveyById(surveyId),
    surveyRepository.getSurveyPageCount(surveyId),
  ]);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);
  assertMaxPagesNotExceeded(pageCount);

  return await surveyPageRepository.createSurveyPage(surveyId);
};

export const deleteSurveyPage = async (data: {
  pageId: string;
  surveyId: string;
  userId: string;
}) => {
  const [survey, pageCount] = await Promise.all([
    surveyRepository.getSurveyById(data.surveyId),
    surveyPageRepository.getSurveyPageCount(data.surveyId),
  ]);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, data.userId);

  if (pageCount === 1)
    throw new AppError(
      "BadRequest",
      "Survey must have at least one page.",
      HttpStatusCode.BAD_REQUEST,
      true
    );

  return await surveyPageRepository.deleteSurveyPage(data.pageId, survey!.id);
};
