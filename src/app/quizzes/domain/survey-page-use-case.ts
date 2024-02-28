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
