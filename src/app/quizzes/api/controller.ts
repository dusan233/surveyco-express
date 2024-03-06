import { NextFunction, Request, Response } from "express";
import {
  createSurveyPage,
  deleteQuestion,
  getQuestion,
  getQuestionsResult,
  getQuestions,
  getSurvey,
  getSurveyPages,
  getSurveyPageQuestionsCount,
  saveQuestion,
  saveSurveyResponse,
  updateQuestionsNumber,
  createQuestion,
  updateQuestion,
  deleteSurveyPage,
  copySurveyPage,
  moveSurveyPage,
  getSurveyResponseQuestionResponses,
  getSurveyCollectors,
  getSurveyResponseCount,
  getSurveyResponses,
  getSurveyResponse,
  getSurveyPagesCount,
  getSurveyCollectorCount,
  getSurveyQuestionCount,
  getSurveyStatus,
  getSurveyPageQuestionResults,
} from "../domain/services";
import {
  CollectorParams,
  CollectorType,
  GetQuestionResultsRequestBody,
  HttpStatusCode,
  MultiChoiceQuestion,
  OperationPosition,
  PlacePageReqBody,
  PlaceQuestionReqBody,
  Question,
  QuestionType,
  SaveSurveyResponseRequestBody,
  SurveyDTO,
  SurveyPageParams,
  SurveyParams,
  SurveyQuestionParams,
  SurveyResponseQuestionResponsesBody,
} from "../../../types/types";
import prisma from "../../../prismaClient";
import { AppError } from "../../../lib/errors";
import { AppError as AppErr } from "../../../lib/error-handling/index";
import { getSurveyCollector } from "../../collectors/domain/services";
import {
  add,
  addDays,
  endOfDay,
  format,
  set,
  setMilliseconds,
  startOfDay,
  sub,
  subDays,
} from "date-fns";
import {
  getBlockedCollectorsFromCookies,
  getSavedSurveyResponsesFromCookies,
  randomizeArray,
  setBlockedCollectorsCookie,
  setSurveyResponseDataCookie,
} from "../../../lib/utils";
import * as surveyService from "../domain/services";
import * as collectorService from "../../collectors/domain/services";
import * as surveyUseCase from "../domain/survey-use-case";
import * as surveyPageUseCase from "../domain/survey-page-use-case";
import * as surveyQuestionUseCase from "../domain/survey-question-use-case";
import * as questionRsponseRepository from "../data-access/question-response-repository";
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
} from "../../collectors/domain/validators";

const createSurveyHandler = async (req: Request, res: Response) => {
  const userId = req.auth.userId;

  const newSurvey = await surveyService.createSurvey(req.body, userId);

  return res.status(HttpStatusCode.CREATED).json(newSurvey);
};

const getSurveyHandler = async (req: Request<SurveyParams>, res: Response) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;
  const survey = await surveyService.getSurveyById(surveyId);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  const [surveyPageCount, surveyResponseCount, questionCount, surveyStatus] =
    await Promise.all([
      surveyService.getSurveyPagesCount(surveyId),
      surveyService.getSurveyResponseCount(surveyId),
      surveyService.getSurveyQuestionCount(surveyId),
      surveyService.getSurveyStatus(surveyId),
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

  const survey = await surveyService.getSurveyById(surveyId);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  const surveyResponseVolume = await surveyService.getSurveyResponseVolume(
    surveyId
  );

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

const saveQuestionHandler = async (
  req: Request<{ quizId: string }, any, { data: Question; pageId: string }>,
  res: Response
) => {
  const quizId = req.params.quizId;
  const userId = req.auth.userId;

  const survey = await getSurvey(quizId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const savedQuestion = await saveQuestion(
    req.body.data,
    quizId,
    req.body.pageId
  );
  return res.status(201).json(savedQuestion);
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

  return res.status(HttpStatusCode.CREATED).json(createdQuestion);
};

const deleteSurveyQuestionHandler = async (
  req: Request<SurveyQuestionParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const questionId = req.params.questionId;
  const userId = req.auth.userId;

  await surveyQuestionUseCase.deleteQuestion({ questionId, surveyId, userId });

  return res.sendStatus(HttpStatusCode.NO_CONTENT);
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

const getSurveyResponseQuestionResponsesHandler = async (
  req: Request<CollectorParams, any, SurveyResponseQuestionResponsesBody>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const collectorId = req.params.collectorId;
  const questionsIds = req.body.questionsIds;

  if (req.cookies && req.cookies.surveResponses) {
    const surveyResponses: {
      id: string;
      surveyId: string;
      collectorId: string;
      submitted: boolean;
    }[] = JSON.parse(req.cookies.surveyResponses);

    const responseExists = surveyResponses.find(
      (response) =>
        response.surveyId === surveyId && collectorId === response.collectorId
    );

    if (responseExists) {
      const questionResponses = await getSurveyResponseQuestionResponses(
        responseExists.id,
        questionsIds
      );

      return res.status(HttpStatusCode.OK).json(questionResponses);
    }

    return res.status(HttpStatusCode.OK).json([]);
  }

  return res.status(HttpStatusCode.OK).json([]);
};

const saveSurveyResponseHandler = async (
  req: Request<SurveyParams, any, SaveSurveyResponseRequestBody>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const collectorId = req.body.collectorId;
  const responderIPAddress = req.ip;

  const validatedData = validateSaveSurveyResponse(req.body);

  if (validatedData.isPreview) {
    const surveyResponse = await surveyService.saveSurveyResponse(
      validatedData,
      responderIPAddress,
      null,
      surveyId
    );
    const submit = surveyResponse.status === "complete";

    return res.status(HttpStatusCode.ACCEPTED).json({ submitted: submit });
  } else {
    const blockedCollectorIds = getBlockedCollectorsFromCookies(
      req.signedCookies
    );
    const surveyResponses = getSavedSurveyResponsesFromCookies(
      req.signedCookies
    );
    assertCollectorNotFinished(blockedCollectorIds, collectorId ?? "");

    const responseExists = surveyResponses.find(
      (surveyRes) =>
        surveyRes.collectorId === collectorId && surveyRes.surveyId === surveyId
    );

    const surveyResponse = await surveyService.saveSurveyResponse(
      validatedData,
      responderIPAddress,
      responseExists?.id ?? null,
      surveyId
    );
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
  req: Request<CollectorParams, any, never, unknown>,
  res: Response
) => {
  const surveyId = req.params.surveyId;

  const validatedQParams = validatesavedQuestionResponsesQueryParams(req.query);
  const collectorId = validatedQParams.collectorId;
  const surveyPageId = validatedQParams.pageId;

  const [survey, page, questions, collector] = await Promise.all([
    surveyService.getSurveyById(surveyId),
    surveyService.getSurveyPage(surveyPageId),
    surveyService.getPageQuestions(surveyId, surveyPageId),
    collectorService.getSurveyCollector(collectorId),
  ]);

  assertSurveyExists(survey);
  if (
    !page ||
    page.surveyId !== surveyId ||
    !collector ||
    collector.surveyId !== surveyId
  )
    throw new AppErr(
      "BadRequest",
      "Invalid inputs.",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  //if survey/collector bond already submitted throw
  const blockedCollectors = getBlockedCollectorsFromCookies(req.signedCookies);
  assertCollectorNotFinished(blockedCollectors, collectorId);

  const previousResponses = getSavedSurveyResponsesFromCookies(
    req.signedCookies
  );
  const responseExists = previousResponses.find(
    (response) =>
      response.surveyId === surveyId && collectorId === response.collectorId
  );

  const questionResponses = responseExists
    ? await surveyService.getSurveyResponseQuestionResponses(
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
  req: Request<SurveyParams, any, never, { pageId?: string }>,
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
    surveyService.getSurveyById(surveyId),
    surveyService.getSurveyPage(req.query.pageId),
  ]);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  if (!page || page.surveyId !== surveyId)
    throw new AppErr(
      "NotFound",
      "Resource not found.",
      HttpStatusCode.NOT_FOUND,
      true
    );

  const questionsResults = await getSurveyPageQuestionResults(
    surveyId,
    req.query.pageId
  );

  return res.status(HttpStatusCode.OK).json(questionsResults);
};

const getQuestionsResultHandler = async (
  req: Request<SurveyParams, never, GetQuestionResultsRequestBody>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;

  const survey = await getSurvey(surveyId);
  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const questionsResults = await getQuestionsResult(
    surveyId,
    req.body.questionIds
  );

  return res.status(HttpStatusCode.OK).json(questionsResults);
};

const getSurveyResponseAnswersHandler = async (
  req: Request<
    SurveyParams & { responseId: string },
    any,
    never,
    { page?: string }
  >,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const responseId = req.params.responseId;
  const page = Number(req.query.page);
  const pageNum = isNaN(page) ? 1 : page;

  const survey = await getSurvey(surveyId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  const questions = await getQuestions(surveyId, pageNum);

  const questionResponses = await getSurveyResponseQuestionResponses(
    responseId,
    questions.map((q) => q.id)
  );

  return res.status(HttpStatusCode.OK).json({
    questions,
    questionResponses,
  });
};

const getSurveyResponseHandler = async (
  req: Request<
    SurveyParams & { responseId: string },
    any,
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
    surveyService.getSurveyById(surveyId),
    surveyService.getSurveyPage(req.query.pageId),
  ]);
  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  if (!page || page.surveyId !== surveyId)
    throw new AppErr(
      "NotFound",
      "Resource not found.",
      HttpStatusCode.NOT_FOUND,
      true
    );

  const [surveyResponse, surveyResponseData] = await Promise.all([
    surveyService.getSurveyResponse(surveyId, responseId),
    surveyService.getSurveyResponseData(responseId, surveyId, req.query.pageId),
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
  req: Request<SurveyParams, any, never, { page?: string; sort?: string }>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;
  const survey = await surveyService.getSurveyById(surveyId);

  const validatedQueryParams = validateSurveyResponsesQueryParams(req.query);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  const surveyResponsesData = await surveyService.getSurveyResponses(
    surveyId,
    validatedQueryParams
  );

  return res.status(HttpStatusCode.OK).json(surveyResponsesData);
};

const getSurveyCollectorsHandler = async (
  req: Request<
    SurveyPageParams,
    any,
    never,
    { page?: string; sort?: string; take?: string }
  >,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;
  const survey = await surveyService.getSurveyById(surveyId);

  const validatedQueryParams = validateSurveyCollectorsQueryParams(req.query);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  const surveyCollectors = await surveyService.getSurveyCollectors(
    surveyId,
    validatedQueryParams
  );

  return res.status(HttpStatusCode.OK).json(surveyCollectors);
};

const getSurveyQuestionsHandler = async (
  req: Request<SurveyParams, any, never, { pageId?: string }>,
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

  await surveyPageUseCase.deleteSurveyPage({ pageId, surveyId, userId });
  return res.sendStatus(HttpStatusCode.NO_CONTENT);
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
  saveQuestionHandler,
  getSurveyHandler,
  saveSurveyResponseHandler,
  getQuestionsResultHandler,
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
  getSurveyResponseQuestionResponsesHandler,
  getSurveyQuestionsAndResponsesHandler,
  getSurveyCollectorsHandler,
  getSurveyResponsesHandler,
  getSurveyResponseHandler,
  getSurveyResponseAnswersHandler,
  getSurveyResponsesVolumeHandler,
  getPageQuestionResultsHandler,
};
