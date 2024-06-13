import { Request, Response } from "express";

import {
  CollectorParams,
  HttpStatusCode,
  SurveyDTO,
  SurveyPageParams,
  SurveyParams,
  SurveyQuestionParams,
} from "../../../types/types";
import { AppError as AppErr } from "../../../lib/error-handling/index";
import {
  getBlockedCollectorsFromCookies,
  getSavedSurveyResponsesFromCookies,
  randomizeArray,
  setBlockedCollectorsCookie,
  setSurveyResponseDataCookie,
} from "../../../lib/utils";
import * as surveyUseCase from "../domain/survey-use-case";
import * as surveyResponseUseCase from "../domain/survey-response-use-case";
import * as collectorUseCase from "../../../app/collectors/domain/collector-use-case";
import * as surveyPageUseCase from "../domain/survey-page-use-case";
import * as surveyQuestionUseCase from "../domain/survey-question-use-case";
import * as questionRsponseRepository from "../data-access/question-response-repository";
import * as questionResponseUseCase from "../domain/question-response-use-case";
import {
  assertCollectorNotFinished,
  assertPageBelongsToSurvey,
  assertPageExists,
  assertSurveyExists,
  assertUserCreatedSurvey,
  validateSaveSurveyResponse,
  validateSurveyCollectorsQueryParams,
  validateSurveyResponsesQueryParams,
  validatesavedQuestionResponsesQueryParams,
} from "../domain/validators";
import {
  assertCollectorBelongsToSurvey,
  assertCollectorExists,
} from "../../../app/collectors/domain/validators";

const createSurveyHandler = async (req: Request, res: Response) => {
  const userId = req.auth.userId;

  const newSurvey = await surveyUseCase.createSurvey(req.body, userId);

  return res.status(HttpStatusCode.CREATED).json(newSurvey);
};

const getSurveyHandler = async (req: Request<SurveyParams>, res: Response) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;
  const survey = await surveyUseCase.getSurvey(surveyId);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  const [surveyPageCount, surveyResponseCount, questionCount, surveyStatus] =
    await Promise.all([
      surveyUseCase.getSurveyPageCount(surveyId),
      surveyUseCase.getSurveyResponseCount(surveyId),
      surveyUseCase.getSurveyQuestionCount(surveyId),
      surveyUseCase.getSurveyStatus(surveyId),
    ]);

  const surveyData: SurveyDTO = {
    ...survey!,
    responses_count: surveyResponseCount,
    page_count: surveyPageCount,
    question_count: questionCount,
    survey_status: surveyStatus,
  };

  return res.status(HttpStatusCode.OK).json(surveyData);
};

const getSurveyResponsesVolumeHandler = async (
  req: Request<SurveyParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;

  const survey = await surveyUseCase.getSurvey(surveyId);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  const surveyResponseVolume =
    await surveyResponseUseCase.getSurveyResponseVolume(surveyId);

  return res.status(HttpStatusCode.OK).json(surveyResponseVolume);
};

const getSurveyPagesHandler = async (
  req: Request<SurveyParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;

  const survey = await surveyUseCase.getSurvey(surveyId);
  assertSurveyExists(survey);

  const surveyPages = await surveyPageUseCase.getSurveyPages(surveyId);

  return res.status(HttpStatusCode.OK).json(surveyPages);
};

const moveQuestionHandler = async (
  req: Request<SurveyQuestionParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const questionId = req.params.questionId;
  const userId = req.auth.userId;

  const movedQuestion = await surveyQuestionUseCase.moveQuestion({
    moveQuestionData: req.body,
    userId,
    surveyId,
    moveQuestionId: questionId,
  });

  return res.status(HttpStatusCode.OK).json(movedQuestion);
};

const copyQuestionHandler = async (
  req: Request<SurveyQuestionParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const copyQuestionId = req.params.questionId;
  const userId = req.auth.userId;

  const createdQuestion = await surveyQuestionUseCase.copyQuestion({
    copyQuestionData: req.body,
    surveyId,
    userId,
    copyQuestionId,
  });

  return res.status(HttpStatusCode.OK).json(createdQuestion);
};

const updateQuestionHandler = async (
  req: Request<SurveyParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;

  const updatedQuestion = await surveyQuestionUseCase.updateQuestion({
    surveyId,
    userId,
    questionData: req.body,
  });

  return res.status(HttpStatusCode.OK).json(updatedQuestion);
};

const createQuestionHandler = async (
  req: Request<SurveyParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;

  const createdQuestion = await surveyQuestionUseCase.addNewQuestion({
    questionData: req.body,
    surveyId,
    userId,
  });

  return res
    .status(HttpStatusCode.CREATED)
    .json({ ...createdQuestion, hasResponses: false });
};

const deleteSurveyQuestionHandler = async (
  req: Request<SurveyQuestionParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const questionId = req.params.questionId;
  const userId = req.auth.userId;

  const question = await surveyQuestionUseCase.deleteQuestion({
    questionId,
    surveyId,
    userId,
  });

  return res.status(HttpStatusCode.OK).json(question);
};

const createSurveyPageHandler = async (
  req: Request<SurveyParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;

  const createdPage = await surveyPageUseCase.createSurveyPage(
    surveyId,
    userId
  );

  return res.status(HttpStatusCode.CREATED).json(createdPage);
};

const saveSurveyResponseHandler = async (
  req: Request<SurveyParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const collectorId = req.body.collectorId;
  const responderIPAddress = req.ip;

  const validatedData = validateSaveSurveyResponse(req.body);

  if (validatedData.isPreview) {
    const surveyResponse = await surveyResponseUseCase.saveSurveyResponse(
      validatedData,
      responderIPAddress,
      null,
      surveyId
    );
    const submit = surveyResponse.status === "complete";

    return res.status(HttpStatusCode.ACCEPTED).json({ submitted: submit });
  } else {
    const blockedCollectorIds = getBlockedCollectorsFromCookies(req.cookies);
    const surveyResponses = getSavedSurveyResponsesFromCookies(
      req.signedCookies
    );
    console.log(blockedCollectorIds, "bloc_col cookie");
    console.log(surveyResponses, "surveyResponses cookie");
    assertCollectorNotFinished(blockedCollectorIds, collectorId ?? "");

    const responseExists = surveyResponses.find(
      (surveyRes) =>
        surveyRes.collectorId === collectorId && surveyRes.surveyId === surveyId
    );

    console.log(responseExists, "saved response with");
    console.log("start save response");
    const surveyResponse = await surveyResponseUseCase.saveSurveyResponse(
      validatedData,
      responderIPAddress,
      responseExists?.id ?? null,
      surveyId
    );
    console.log(surveyResponse, "survey response data");
    console.log("finish save Response");
    const submit = surveyResponse.status === "complete";

    if (surveyResponse.id !== "preview") {
      if (responseExists) {
        if (submit) {
          blockedCollectorIds.push(collectorId!);
          setBlockedCollectorsCookie(res, blockedCollectorIds);

          const filteredResponses = surveyResponses.filter(
            (sRes) => sRes.id !== surveyResponse.id
          );
          setSurveyResponseDataCookie(res, filteredResponses);
        }
      } else {
        if (submit) {
          blockedCollectorIds.push(collectorId!);
          setBlockedCollectorsCookie(res, blockedCollectorIds);
        } else {
          const newSurveyResponse = {
            id: surveyResponse.id,
            surveyId,
            collectorId: collectorId!,
            submitted: submit,
          };
          const updatedSurveyResponsesData = [
            ...surveyResponses,
            newSurveyResponse,
          ];
          setSurveyResponseDataCookie(res, updatedSurveyResponsesData);
        }
      }
    }

    return res.status(HttpStatusCode.ACCEPTED).json({ submitted: submit });
  }
};

const getSurveyQuestionsAndResponsesHandler = async (
  req: Request<CollectorParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;

  const validatedQParams = validatesavedQuestionResponsesQueryParams(req.query);
  const collectorId = validatedQParams.collectorId;
  const surveyPageId = validatedQParams.pageId;

  const [survey, page, questions, collector] = await Promise.all([
    surveyUseCase.getSurvey(surveyId),
    surveyPageUseCase.getSurveyPage(surveyPageId),
    surveyQuestionUseCase.getQuestions(surveyPageId),
    collectorUseCase.getCollector(collectorId),
  ]);

  assertSurveyExists(survey);
  assertPageExists(page);
  assertPageBelongsToSurvey(page!, survey!.id);
  assertCollectorExists(collector);
  assertCollectorBelongsToSurvey(survey!, collector!);
  //if survey/collector bond already submitted throw
  const blockedCollectors = getBlockedCollectorsFromCookies(req.cookies);
  assertCollectorNotFinished(blockedCollectors, collectorId);

  const previousResponses = getSavedSurveyResponsesFromCookies(
    req.signedCookies
  );
  const responseExists = previousResponses.find(
    (response) =>
      response.surveyId === surveyId && collectorId === response.collectorId
  );

  const questionResponses = responseExists
    ? await questionResponseUseCase.getQuestionResponses(
        responseExists.id,
        questions.map((q) => q.id)
      )
    : [];

  return res.status(HttpStatusCode.OK).json({
    questions: questions.map((question) => {
      if (question.randomize)
        return { ...question, options: randomizeArray(question.options) };

      return question;
    }),
    questionResponses,
    page: surveyPageId,
  });
};

const getPageQuestionResultsHandler = async (
  req: Request<SurveyParams, undefined, never, { pageId?: string }>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;

  if (!req.query.pageId)
    throw new AppErr(
      "BadRequest",
      "Invalid inputs.",
      HttpStatusCode.BAD_REQUEST,
      true
    );

  const [survey, page] = await Promise.all([
    surveyUseCase.getSurvey(surveyId),
    surveyPageUseCase.getSurveyPage(req.query.pageId),
  ]);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);
  assertPageExists(page);
  assertPageBelongsToSurvey(page!, survey!.id);

  const questionsResults =
    await surveyQuestionUseCase.getQuestionResultsByPageId(
      surveyId,
      req.query.pageId
    );

  return res.status(HttpStatusCode.OK).json(questionsResults);
};

const getSurveyResponseHandler = async (
  req: Request<
    SurveyParams & { responseId: string },
    undefined,
    never,
    { pageId?: string }
  >,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const responseId = req.params.responseId;
  const userId = req.auth.userId;

  if (!req.query.pageId)
    throw new AppErr(
      "BadRequest",
      "Invalid inputs.",
      HttpStatusCode.BAD_REQUEST,
      true
    );

  const [survey, page] = await Promise.all([
    surveyUseCase.getSurvey(surveyId),
    surveyPageUseCase.getSurveyPage(req.query.pageId),
  ]);
  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);
  assertPageExists(page);
  assertPageBelongsToSurvey(page!, survey!.id);

  const [surveyResponse, surveyResponseData] = await Promise.all([
    surveyResponseUseCase.getSurveyResponse(surveyId, responseId),
    surveyResponseUseCase.getSurveyResponseData(responseId, req.query.pageId),
  ]);

  if (!surveyResponse)
    throw new AppErr(
      "NotFound",
      "Resource not found.",
      HttpStatusCode.NOT_FOUND,
      true
    );

  return res.status(HttpStatusCode.OK).json({
    surveyResponse,
    questions: surveyResponseData.questions,
    questionResponses: surveyResponseData.questionResponses,
    page: req.query.pageId,
  });
};

const getSurveyResponsesHandler = async (
  req: Request<
    SurveyParams,
    undefined,
    never,
    { page?: string; sort?: string }
  >,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;
  const survey = await surveyUseCase.getSurvey(surveyId);

  const validatedQueryParams = validateSurveyResponsesQueryParams(req.query);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  const surveyResponsesData = await surveyResponseUseCase.getSurveyResponses(
    surveyId,
    validatedQueryParams
  );

  return res.status(HttpStatusCode.OK).json(surveyResponsesData);
};

const getSurveyCollectorsHandler = async (
  req: Request<
    SurveyPageParams,
    undefined,
    never,
    { page?: string; sort?: string; take?: string }
  >,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;
  const survey = await surveyUseCase.getSurvey(surveyId);

  const validatedQueryParams = validateSurveyCollectorsQueryParams(req.query);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  const surveyCollectors = await surveyUseCase.getSurveyCollectors(
    surveyId,
    validatedQueryParams
  );

  return res.status(HttpStatusCode.OK).json(surveyCollectors);
};

const getSurveyQuestionsHandler = async (
  req: Request<SurveyParams, undefined, never, { pageId?: string }>,
  res: Response
) => {
  const surveyId = req.params.surveyId;

  if (!req.query.pageId)
    throw new AppErr(
      "BadRequest",
      "Invalid inputs.",
      HttpStatusCode.BAD_REQUEST,
      true
    );

  const [survey, page] = await Promise.all([
    surveyUseCase.getSurvey(surveyId),
    surveyPageUseCase.getSurveyPage(req.query.pageId),
  ]);

  assertSurveyExists(survey);
  assertPageExists(page);
  assertPageBelongsToSurvey(page!, survey!.id);

  const questions = await surveyQuestionUseCase.getQuestions(req.query.pageId);
  const questionsResponseCount =
    await questionRsponseRepository.getQuestionResponseCountPerQuestion(
      questions.map((q) => q.id)
    );
  const formatedQuestions = questions.map((q) => {
    const questionResponseCount = questionsResponseCount.find(
      (qRes) => qRes.questionId === q.id
    );

    if (questionResponseCount)
      return { ...q, hasResponses: questionResponseCount._count > 0 };
    return q;
  });

  return res
    .status(HttpStatusCode.OK)
    .json({ questions: formatedQuestions, page: req.query.pageId });
};

const deleteSurveyPageHandler = async (
  req: Request<SurveyPageParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const pageId = req.params.pageId;
  const userId = req.auth.userId;

  const page = await surveyPageUseCase.deleteSurveyPage({
    pageId,
    surveyId,
    userId,
  });
  return res.status(HttpStatusCode.OK).json(page);
};

const copySurveyPageHandler = async (
  req: Request<SurveyPageParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const sourcePageId = req.params.pageId;
  const userId = req.auth.userId;

  const createdPage = await surveyPageUseCase.copySurveyPage({
    copyPageData: req.body,
    surveyId,
    userId,
    copyPageId: sourcePageId,
  });

  return res.status(HttpStatusCode.CREATED).json(createdPage);
};

const moveSurveyPageHandler = async (
  req: Request<SurveyPageParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const sourcePageId = req.params.pageId;
  const userId = req.auth.userId;

  const movedPage = await surveyPageUseCase.moveSurveyPage({
    movePageData: req.body,
    surveyId,
    userId,
    movePageId: sourcePageId,
  });

  return res.status(HttpStatusCode.OK).json(movedPage);
};

export default {
  createSurveyHandler,
  getSurveyQuestionsHandler,
  getSurveyHandler,
  saveSurveyResponseHandler,
  getSurveyPagesHandler,
  deleteSurveyQuestionHandler,
  createSurveyPageHandler,
  copyQuestionHandler,
  moveQuestionHandler,
  createQuestionHandler,
  updateQuestionHandler,
  deleteSurveyPageHandler,
  copySurveyPageHandler,
  moveSurveyPageHandler,
  getSurveyQuestionsAndResponsesHandler,
  getSurveyCollectorsHandler,
  getSurveyResponsesHandler,
  getSurveyResponseHandler,
  getSurveyResponsesVolumeHandler,
  getPageQuestionResultsHandler,
};
