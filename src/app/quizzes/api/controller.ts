import { NextFunction, Request, Response } from "express";
import {
  createQuiz,
  createSurveyCollector,
  getQuestionResponses,
  getQuestions,
  getSurvey,
  getSurveyCollector,
  saveQuestion,
  saveSurveyResponse,
} from "../domain/services";
import {
  CollectorParams,
  CollectorType,
  CreateQuizData,
  HttpStatusCode,
  MultiChoiceQuestion,
  Question,
  QuestionType,
  SaveSurveyResponseRequestBody,
  SurveyParams,
} from "../../../types/types";
import prisma from "../../../prismaClient";
import { AppError } from "../../../lib/errors";

const createQuizHandler = async (
  req: Request<any, any, CreateQuizData>,
  res: Response,
  next: NextFunction
) => {
  const createdQuiz = await createQuiz(req.auth.userId, req.body);
  return res.status(201).json(createdQuiz);
};

const getSurveyHandler = async (
  req: Request<SurveyParams>,
  res: Response,
  next: NextFunction
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;
  const survey = await getSurvey(surveyId, true);

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

  return res.status(200).json(survey);
};

const saveQuestionHandler = async (
  req: Request<{ quizId: string }, any, Question>,
  res: Response,
  next: NextFunction
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

  const savedQuestion = await saveQuestion(req.body, quizId);
  return res.status(201).json(savedQuestion);
};

const getSurveyCollectorHandler = async (
  req: Request<CollectorParams>,
  res: Response,
  next: NextFunction
) => {
  console.log("ovde sam");
  //revisit this after ur certein u can implement all the nessesery logic
  const collectorId = req.params.collectorId;

  const collector = await getSurveyCollector(collectorId);

  return res.status(HttpStatusCode.ACCEPTED).json(collector);
};

const createSurveyCollectorHandler = async (
  req: Request<SurveyParams, any, { type: CollectorType }>,
  res: Response,
  next: NextFunction
) => {
  const surveyId = req.params.surveyId;
  const collectorType = req.body.type;
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

  const collector = await createSurveyCollector(collectorType, surveyId);

  return res.status(HttpStatusCode.CREATED).json(collector);
};

const saveSurveyResponseHandler = async (
  req: Request<CollectorParams, any, SaveSurveyResponseRequestBody>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const collectorId = req.params.collectorId;

  const collector = await getSurveyCollector(collectorId);
  if (!collector || collector.surveyId !== surveyId)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  const surveyResponse = await saveSurveyResponse(req.body, collectorId);

  return res.status(HttpStatusCode.ACCEPTED).json(surveyResponse);
};

const getSurveyResponsesHandler = async (
  req: Request<SurveyParams>,
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

  const questions = await getQuestions(surveyId);
  const questionResponsesData = await getQuestionResponses(questions);
  const acctualData = questions.map((q, index) => {
    return {
      questionId: q.id,
      results: questionResponsesData[index].map((option: any) => ({
        answer: option.answer,
        answerCount: option._count.answer,
      })),
    };
  });

  return res.status(HttpStatusCode.OK).json({
    ds: "",
    results: acctualData,
  });
};

const getSurveyQuestionsHandler = async (
  req: Request<SurveyParams>,
  res: Response,
  next: NextFunction
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

  const questions = await getQuestions(surveyId);

  return res.status(HttpStatusCode.OK).json({ questions });
};

export default {
  createQuizHandler,
  getSurveyQuestionsHandler,
  createSurveyCollectorHandler,
  saveQuestionHandler,
  getSurveyHandler,
  getSurveyCollectorHandler,
  saveSurveyResponseHandler,
  getSurveyResponsesHandler,
};
