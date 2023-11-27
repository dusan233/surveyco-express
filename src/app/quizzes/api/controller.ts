import { NextFunction, Request, Response } from "express";
import {
  createQuiz,
  createSurveyCollector,
  createSurveyPage,
  deleteQuestion,
  getQuestion,
  getQuestionResponses,
  getQuestions,
  getSurvey,
  getSurveyCollector,
  getSurveyPages,
  getSurveyQuestionsCount,
  saveQuestion,
  saveSurveyResponse,
} from "../domain/services";
import {
  CollectorParams,
  CollectorType,
  CreateQuizData,
  HttpStatusCode,
  MultiChoiceQuestion,
  OperationPosition,
  PlaceQuestionReqBody,
  Question,
  QuestionType,
  SaveSurveyResponseRequestBody,
  SurveyParams,
  SurveyQuestionParams,
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

const getSurveyPagesHandler = async (
  req: Request<SurveyParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;

  const survey = await getSurvey(surveyId);
  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  const surveyPages = await getSurveyPages(surveyId);
  const formatedSurveyPages = surveyPages.map((page) => ({
    id: page.id,
    created_at: page.created_at,
    updated_at: page.updated_at,
    surveyId: page.surveyId,
    number: page.number,
    totalQuestions: page._count.questions,
  }));

  return res.status(HttpStatusCode.OK).json(formatedSurveyPages);
};

const copyQuestionHandler = async (
  req: Request<SurveyQuestionParams, any, PlaceQuestionReqBody>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const questionId = req.params.questionId;
  const userId = req.auth.userId;

  const [survey, question] = await Promise.all([
    getSurvey(surveyId),
    getQuestion(questionId),
  ]);

  if (!survey || !question)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId || question.quizId !== surveyId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  //transactione
  //prvo gde ubacujes pitanje pomeri sve ispred njega za 1.
  //sacuvaj pitanje sa numberom koji god da je.
  await prisma.$transaction(async (tx) => {
    const copiedQuestionNumber =
      req.body.position === OperationPosition.after
        ? req.body.questionNumber + 1
        : req.body.questionNumber;
  });

  return res.status(HttpStatusCode.OK).json({ body: req.body });
};

const saveQuestionHandler = async (
  req: Request<{ quizId: string }, any, { data: Question; pageId: string }>,
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

  const savedQuestion = await saveQuestion(
    req.body.data,
    quizId,
    req.body.pageId
  );
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

const deleteSurveyQuestionHandler = async (
  req: Request<SurveyQuestionParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const questionId = req.params.questionId;
  const userId = req.auth.userId;

  const [survey, question] = await Promise.all([
    getSurvey(surveyId),
    getQuestion(questionId),
  ]);

  if (!survey || !question)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId || question.quizId !== surveyId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  //here we deleting if question has no responses

  await deleteQuestion(question);

  return res.sendStatus(HttpStatusCode.NO_CONTENT);
};

const createSurveyPageHandler = async (
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

  const createdPage = await createSurveyPage(surveyId);

  return res.status(HttpStatusCode.CREATED).json(createdPage);
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

  const questions = await getQuestions(surveyId, 1);
  const questionResponsesData = await getQuestionResponses(questions);
  const acctualData = questions.map((q, index) => {
    return {
      questionId: q.id,
      results: questionResponsesData[index],
      // .map((option: any) => ({
      //   answer: option.answer,
      //   answerCount: option._count.answer,
      // })),
    };
  });

  return res.status(HttpStatusCode.OK).json({
    ds: "",
    results: acctualData,
  });
};

const getSurveyQuestionsHandler = async (
  req: Request<SurveyParams, any, never, { page?: string }>,
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

  const questions = await getQuestions(surveyId, Number(req.query.page));

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
  getSurveyPagesHandler,
  deleteSurveyQuestionHandler,
  createSurveyPageHandler,
  copyQuestionHandler,
};
