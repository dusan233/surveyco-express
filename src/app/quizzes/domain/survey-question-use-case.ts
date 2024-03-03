import * as surveyRepository from "../data-access/survey-repository";
import * as questionRepository from "../data-access/question-repository";
import {
  assertQuestionBelongsToSurvey,
  assertQuestionExists,
  assertSurveyExists,
  assertUserCreatedSurvey,
  validateCreateQuestion,
  validatePlaceQuestion,
  validateUpdateQuestion,
} from "./validators";
import {
  CreateQuestionDTO,
  PlaceQuestionDTO,
  UpdateQuestionDTO,
} from "../../../types/types";

export const getQuestions = async (pageId: string) => {
  return await questionRepository.getQuestionsByPageId(pageId);
};

export const updateQuestion = async (data: {
  questionData: any;
  surveyId: string;
  userId: string;
}) => {
  const validatedData = validateUpdateQuestion(data.questionData);

  const [survey, question] = await Promise.all([
    surveyRepository.getSurveyById(data.surveyId),
    questionRepository.getQuestionById(validatedData.data.id),
  ]);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, data.userId);
  assertQuestionExists(question);
  assertQuestionBelongsToSurvey(question!, survey!.id);

  const updateQuestionData: UpdateQuestionDTO = {
    ...validatedData,
    surveyId: data.surveyId,
  };

  return await questionRepository.updateQuestion(updateQuestionData);
};

export const addNewQuestion = async (data: {
  questionData: unknown;
  surveyId: string;
  userId: string;
}) => {
  const validatedData = validateCreateQuestion(data.questionData);

  const [survey] = await Promise.all([
    surveyRepository.getSurveyById(data.surveyId),
  ]);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, data.userId);

  const newQuestionData: CreateQuestionDTO = {
    ...validatedData,
    surveyId: data.surveyId,
    userId: data.userId,
  };

  return await questionRepository.addQuestion(newQuestionData);
};

export const moveQuestion = async (data: {
  moveQuestionData: unknown;
  surveyId: string;
  userId: string;
  moveQuestionId: string;
}) => {
  const validatedData = validatePlaceQuestion(data.moveQuestionData);

  const survey = await surveyRepository.getSurveyById(data.surveyId);
  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, data.userId);

  const moveQuestionData: PlaceQuestionDTO = {
    targetQuestionId: validatedData.questionId,
    targetPageId: validatedData.pageId,
    position: validatedData.position,
    sourceQuestionId: data.moveQuestionId,
    surveyId: data.surveyId,
  };

  return await questionRepository.moveQuestion(moveQuestionData);
};

export const copyQuestion = async (data: {
  copyQuestionData: unknown;
  surveyId: string;
  userId: string;
  copyQuestionId: string;
}) => {
  const validatedData = validatePlaceQuestion(data.copyQuestionData);

  const survey = await surveyRepository.getSurveyById(data.surveyId);
  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, data.userId);

  const copyQuestionData: PlaceQuestionDTO = {
    targetQuestionId: validatedData.questionId,
    targetPageId: validatedData.pageId,
    position: validatedData.position,
    sourceQuestionId: data.copyQuestionId,
    surveyId: data.surveyId,
  };

  return await questionRepository.copyQuestion(copyQuestionData);
};

export const deleteQuestion = async (data: {
  questionId: string;
  surveyId: string;
  userId: string;
}) => {
  const [survey, question] = await Promise.all([
    surveyRepository.getSurveyById(data.surveyId),
    questionRepository.getQuestionById(data.questionId),
  ]);

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, data.userId);
  assertQuestionExists(question);
  assertQuestionBelongsToSurvey(question!, survey!.id);

  return await questionRepository.deleteQuestion(data.questionId);
};
