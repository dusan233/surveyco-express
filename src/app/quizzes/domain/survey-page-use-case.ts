import { AppError } from "@/lib/error-handling";
import { HttpStatusCode, PlacePageDTO } from "@/types/types";
import * as surveyPageRepository from "../data-access/survey-page-repository";
import * as surveyRepository from "../data-access/survey-repository";
import {
  assertSurveyExists,
  assertUserCreatedSurvey,
  validatePlacePage,
} from "./validators";

export const getSurveyPage = async (pageId: string) => {
  return await surveyPageRepository.getSurveyPageById(pageId);
};

export const getSurveyPages = async (surveyId: string) => {
  return await surveyPageRepository.getSurveyPages(surveyId);
};

export const createSurveyPage = async (surveyId: string, userId: string) => {
  const [survey] = await Promise.all([
    surveyRepository.getSurveyById(surveyId),
  ]);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  return await surveyPageRepository.createSurveyPage(surveyId);
};

export const moveSurveyPage = async (data: {
  movePageData: unknown;
  surveyId: string;
  userId: string;
  movePageId: string;
}) => {
  const validatedData = validatePlacePage(data.movePageData);

  const survey = await surveyRepository.getSurveyById(data.surveyId);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, data.userId);

  const movePageData: PlacePageDTO = {
    surveyId: data.surveyId,
    sourcePageId: data.movePageId,
    targetPageId: validatedData.pageId,
    position: validatedData.position,
  };

  return await surveyPageRepository.moveSurveyPage(movePageData);
};

export const copySurveyPage = async (data: {
  copyPageData: unknown;
  surveyId: string;
  userId: string;
  copyPageId: string;
}) => {
  const validatedData = validatePlacePage(data.copyPageData);

  const survey = await surveyRepository.getSurveyById(data.surveyId);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, data.userId);

  const copyPageData: PlacePageDTO = {
    surveyId: data.surveyId,
    sourcePageId: data.copyPageId,
    targetPageId: validatedData.pageId,
    position: validatedData.position,
  };

  return await surveyPageRepository.copySurveyPage(copyPageData);
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
