import { add, format, startOfDay } from "date-fns";
import * as surveyResponseRepository from "../data-access/survey-response-repository";
import * as questionResponseRepository from "../data-access/question-response-repository";
import {
  OrderByObject,
  SaveSurveyResponseData,
  SurveyResponsesDTO,
} from "../../../types/types";
import {
  assertPageBelongsToSurvey,
  assertPageExists,
  assertQuestionResponsesDataIsValid,
  assertSurveyExists,
  validateSaveSurveyResponse,
} from "./validators";
import * as surveyPageRepository from "../data-access/survey-page-repository";
import * as surveyRepository from "../data-access/survey-repository";
import * as questionRepository from "../data-access/question-repository";
import * as collectorRepository from "../../../app/collectors/data-access/collectors.repository";
import {
  assertCollectorBelongsToSurvey,
  assertCollectorExists,
  assertCollectorIsOpen,
} from "../../../app/collectors/domain/validators";
import { checkForSurveyUpdated } from "./survey-use-case";

export const getSurveyResponseVolume = async (surveyId: string) => {
  const currentDate = new Date();
  console.log(currentDate);
  const tenDaysAgo = new Date(currentDate);
  tenDaysAgo.setDate(currentDate.getDate() - 10);

  const surveyResponseCountPerDay =
    await surveyResponseRepository.getSurveyResponseCountRangeDate(
      surveyId,
      tenDaysAgo.toISOString(),
      currentDate.toISOString()
    );
  console.log(surveyResponseCountPerDay, "surveyResponseCountPerDay");

  const dateObjects = [];
  const startDate = new Date(tenDaysAgo);
  const endDate = new Date(currentDate);
  console.log(startDate, "startDate");
  console.log(endDate, "endDate");

  console.log("while begins!!!!!!");
  while (startDate <= endDate) {
    const day = format(startDate, "yyyy-MM-dd");
    const startDayDate = new Date(day);
    const endDayDate = startOfDay(add(startDayDate, { days: 1 }));

    // Set hours, minutes, and seconds to get the end of the day
    endDayDate.setUTCHours(23);
    endDayDate.setUTCMinutes(59);
    endDayDate.setUTCSeconds(59);
    endDayDate.setUTCMilliseconds(999);

    // Subtract 1 millisecond to get the end of the previous day
    console.log(
      startDayDate,
      endDayDate,
      "while start end for each of 10 days"
    );
    let responseCount = 0;
    surveyResponseCountPerDay.forEach((resCount) => {
      if (
        resCount.created_at >= startDayDate &&
        resCount.created_at <= endDayDate
      ) {
        responseCount += resCount._count._all;
      }
    });
    dateObjects.push({
      day: format(startDate, "yyyy-MM-dd"),
      response_count: responseCount,
    });

    // Move to the next day
    startDate.setDate(startDate.getDate() + 1);
  }
  console.log("while ends!!!!!!");
  console.log(dateObjects);
  return dateObjects;
};

export const saveSurveyResponse = async (
  surveyResponseData: SaveSurveyResponseData,
  responderIPAddress: string,
  responseId: string | null,
  surveyId: string
) => {
  const validatedData = validateSaveSurveyResponse(surveyResponseData);

  const [page, survey, pageQuestions, surveyPages] = await Promise.all([
    surveyPageRepository.getSurveyPageById(surveyResponseData.pageId),
    surveyRepository.getSurveyById(surveyId),
    questionRepository.getQuestionsByPageId(surveyResponseData.pageId),
    surveyPageRepository.getSurveyPages(surveyId),
  ]);
  // check if responses exist for provided ids.
  assertSurveyExists(survey);

  assertPageExists(page);
  assertPageBelongsToSurvey(page!, surveyId);

  await checkForSurveyUpdated(
    surveyId,
    surveyResponseData.surveyResposneStartTime
  );

  assertQuestionResponsesDataIsValid(
    validatedData.questionResponses,
    pageQuestions
  );

  const submitting =
    surveyPages.find((page) => page.number === surveyPages.length)?.id ===
    surveyResponseData.pageId;
  // make sure all required qeustions are answered before submit complete
  // if (submitting && surveyPages.length >= 2) {
  // }

  if (surveyResponseData.isPreview)
    return {
      id: "preview",
      status: submitting ? "complete" : "incomplete",
    };

  const collector = await collectorRepository.getCollectorById(
    surveyResponseData.collectorId!
  );
  assertCollectorExists(collector);
  assertCollectorBelongsToSurvey(survey!, collector!);
  assertCollectorIsOpen(collector!);

  const saveResponseData = {
    data: validatedData,
    collectorId: validatedData.collectorId!,
    surveyId,
    complete: submitting,
    responderIPAddress,
    surveyResponseId: responseId ?? null,
  };

  return await surveyResponseRepository.saveSurveyResponse(saveResponseData);
};

export const getSurveyResponse = async (
  surveyId: string,
  responseId: string
) => {
  return await surveyResponseRepository.getSurveyResponse(responseId, surveyId);
};

export const getSurveyResponseData = async (
  surveyResponseId: string,
  pageId: string
) => {
  const questions = await questionRepository.getQuestionsByPageId(pageId);
  const questionIds = questions.map((q) => q.id);
  const questionResponses =
    await questionResponseRepository.getQuestionResponsesBySurveyResponseId(
      surveyResponseId,
      questionIds
    );

  return { questions, questionResponses };
};

export const getSurveyResponses = async (
  surveyId: string,
  params: {
    page: number;
    sort: OrderByObject;
  }
) => {
  const take = 30;
  const skip = (params.page - 1) * take;
  const [responses, responsesCount] = await Promise.all([
    surveyResponseRepository.getSurveyResponsesBySurveyId(surveyId, {
      take,
      skip,
      sort: params.sort,
    }),
    surveyResponseRepository.getSurveyResponseCount(surveyId),
  ]);

  const responsesData: SurveyResponsesDTO = {
    data: responses,
    total_pages: Math.ceil(responsesCount / take),
    responses_count: responsesCount,
  };

  return responsesData;
};
