import { NextFunction, Request, Response } from "express";
import { createQuiz, getSurvey, saveQuestion } from "../domain/services";
import {
  CreateQuizData,
  HttpStatusCode,
  MultiChoiceQuestion,
  Question,
  QuestionType,
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

export default { createQuizHandler, saveQuestionHandler, getSurveyHandler };
