import * as surveyRepository from "../data-access/survey-repository";
import * as surveyPageRepository from "../data-access/survey-page-repository";
import * as surveyResponseRepository from "../data-access/survey-response-repository";
import * as questionRepository from "../data-access/question-repository";
import * as collectorRepository from "../../collectors/data-access/collectors.repository";
import { validateNewSurvey } from "./validators";
import {
  HttpStatusCode,
  OrderByObject,
  SurveyCollectorsDTO,
  SurveyStatus,
} from "../../../types/types";
import { AppError } from "../../../lib/error-handling";

export const getSurvey = async (surveyId: string) => {
  return await surveyRepository.getSurveyById(surveyId);
};

export const createSurvey = async (data: unknown, userId: string) => {
  const validatedData = validateNewSurvey(data);
  const newSurveyData = { ...validatedData, userId: userId };

  return await surveyRepository.createSurvey(newSurveyData);
};

export const getSurveyCollectors = async (
  surveyId: string,
  params: {
    page: number;
    take: number;
    sort: OrderByObject;
  }
) => {
  const skip = (params.page - 1) * params.take;

  const [collectors, collectorCount] = await Promise.all([
    collectorRepository.getCollectorsBySurveyId(surveyId, {
      take: params.take,
      skip,
      sort: params.sort,
    }),
    collectorRepository.getCollectorCountBySurveyId(surveyId),
  ]);

  const formatedCollectors = collectors.map((collector) => ({
    id: collector.id,
    name: collector.name,
    created_at: collector.created_at,
    updated_at: collector.updated_at,
    status: collector.status,
    type: collector.type,
    surveyId: collector.surveyId,
    total_responses: collector._count.responses,
  }));

  const surveyCollectorsData: SurveyCollectorsDTO = {
    data: formatedCollectors,
    total_pages: Math.ceil(collectorCount / params.take),
    collector_count: collectorCount,
  };

  return surveyCollectorsData;
};

export const getSurveyPageCount = async (surveyId: string) => {
  return await surveyPageRepository.getPageCountBySurveyId(surveyId);
};
export const getSurveyResponseCount = async (surveyId: string) => {
  return await surveyResponseRepository.getSurveyResponseCount(surveyId);
};
export const getSurveyQuestionCount = async (surveyId: string) => {
  return await questionRepository.getSurveyQuestionCount(surveyId);
};

export const getSurveyStatus = async (surveyId: string) => {
  const collectorsDistinctStatuses =
    await collectorRepository.getSurveyCollectorStatuses(surveyId);

  if (collectorsDistinctStatuses.length === 0) {
    return SurveyStatus.draft;
  }

  if (collectorsDistinctStatuses.includes(SurveyStatus.open)) {
    return SurveyStatus.open;
  } else {
    return SurveyStatus.close;
  }
};

export const checkForSurveyUpdated = async (surveyId: string, date: Date) => {
  const isUpdated = await surveyRepository.getSurveyIfUpdated(surveyId, date);

  if (isUpdated)
    throw new AppError(
      "Conflict",
      "Resource changed!",
      HttpStatusCode.CONFLICT,
      true
    );
};
