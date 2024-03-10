import * as surveyRepository from "../data-access/survey-repository";
import * as questionRepository from "../data-access/question-repository";
import * as questionResponseRepository from "../data-access/question-response-repository";
import * as questionAnswerRepository from "../data-access/question-answer-repository";
import * as surveyResponseRepository from "../data-access/survey-response-repository";
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
  QuestionType,
  UpdateQuestionDTO,
} from "@/types/types";

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

export const getQuestionResultsByPageId = async (
  surveyId: string,
  pageId: string
) => {
  const [questions, totalSurveyResponses] = await Promise.all([
    questionRepository.getQuestionsByPageId(pageId),
    surveyResponseRepository.getSurveyResponseCount(surveyId),
  ]);

  const questionResponses =
    await questionResponseRepository.getQuestionResponseCountPerQuestion(
      questions.map((q) => q.id)
    );

  const choiceResponseResults =
    await questionAnswerRepository.getChoiceCountPerQuestion(
      questions.filter((q) => q.type !== QuestionType.textbox).map((q) => q.id)
    );

  const textboxQuestionAnswers = (
    await Promise.all(
      questions
        .filter((q) => q.type == QuestionType.textbox)
        .map((q) => questionAnswerRepository.getQuestionAnswers(q.id))
    )
  ).flat();

  const questionsResults = questions.map((q) => {
    const questionResponsesCount =
      questionResponses.find((qRes) => qRes.questionId === q.id)?._count || 0;
    if (q.type === QuestionType.textbox) {
      return {
        ...q,
        answeredCount: questionResponsesCount,
        skippedCount: totalSurveyResponses - questionResponsesCount,
        answers: textboxQuestionAnswers
          .filter((answer) => answer.questionId === q.id)
          .map((answer) => ({
            id: answer.id,
            questionResponseId: answer.questionResponseId,
            text: answer.textAnswer,
            updated_at: answer.updated_at,
          })),
      };
    } else {
      return {
        ...q,
        answeredCount: questionResponsesCount,
        skippedCount: totalSurveyResponses - questionResponsesCount,
        choices: q.options.map((qChoice) => {
          const choiceResponsesCount =
            choiceResponseResults.find(
              (cRes) => cRes.questionOptionId === qChoice.id
            )?._count || 0;
          return {
            ...qChoice,
            answeredCount: choiceResponsesCount,
          };
        }),
      };
    }
  });

  return questionsResults;
};
