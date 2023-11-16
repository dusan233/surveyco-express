import { Prisma, Question } from "@prisma/client";
import prisma from "../../../prismaClient";
import {
  CollectorType,
  CreateQuizData,
  MultiChoiceQuestion,
  QuestionType,
  Question as Questione,
  SaveSurveyResponseRequestBody,
} from "../../../types/types";

export const createQuiz = async (userId: string, data: CreateQuizData) => {
  const newQuiz = await prisma.quiz.create({
    data: {
      title: data.title,
      category: data.category,
      creator: {
        connect: { id: userId },
      },
    },
  });

  return newQuiz;
};

export const getSurvey = async (
  surveyId: string,
  includeQuestions: boolean = false
) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: surveyId },
    include: includeQuestions
      ? { questions: { include: { options: true }, take: 30 } }
      : null,
  });

  return quiz;
};

export const getQuestionResponses = async (
  questions: ({
    options: {
      id: string;
      description: string;
      questionId: string;
      created_at: Date;
      updated_at: Date | null;
    }[];
  } & {
    id: string;
    description: string;
    type: string;
    created_at: Date;
    updated_at: Date | null;
    quizId: string;
  })[]
) => {
  const questionResponsePromises: Promise<any>[] = [];
  questions.forEach((question) => {
    if (question.type === QuestionType.textbox) {
      questionResponsePromises.push(Promise.resolve([]));
    } else {
      questionResponsePromises.push(
        prisma.questionResponse.groupBy({
          by: ["answer"],
          where: {
            questionId: question.id,
          },
          _count: {
            answer: true,
          },
        })
      );
    }
  });

  return await Promise.all(questionResponsePromises);
};

export const getQuestions = async (
  surveyId: string,
  skip: number = 0,
  take: number = 30
) => {
  const questions = await prisma.question.findMany({
    where: {
      quizId: surveyId,
    },
    skip,
    take,
    orderBy: { created_at: "asc" },
    include: {
      options: true,
    },
  });

  return questions;
};

export const createSurveyCollector = async (
  collectorType: CollectorType,
  surveyId: string
) => {
  const collector = await prisma.surveyCollector.create({
    data: {
      type: collectorType,
      status: "open",
      survey: { connect: { id: surveyId } },
    },
  });

  return collector;
};

export const getSurveyCollector = async (collectorId: string) => {
  const collector = await prisma.surveyCollector.findUnique({
    where: { id: collectorId },
  });

  return collector;
};

export const saveSurveyResponse = async (
  data: SaveSurveyResponseRequestBody,
  collectorId: string
) => {
  const questionResponses: { questionId: string; answer: string }[] = [];
  const filteredResponses = data.responses.filter(
    (response) => response.answer.length !== 0
  );
  filteredResponses.forEach((qResponse) =>
    typeof qResponse.answer === "string"
      ? questionResponses.push({
          questionId: qResponse.id,
          answer: qResponse.answer,
        })
      : qResponse.answer.forEach((answer) =>
          questionResponses.push({ questionId: qResponse.id, answer })
        )
  );

  const surveyResponse = await prisma.surveyResponse.create({
    data: {
      collector: {
        connect: {
          id: collectorId,
        },
      },
      answers: {
        create: questionResponses.map((answer) => ({
          answer: answer.answer,
          question: {
            connect: { id: answer.questionId },
          },
        })),
      },
    },
  });

  return surveyResponse;
};

export const saveQuestion = async (data: Questione, quizId: string) => {
  const { id: questionId, ...questionData } = data;

  const savedQuestion = await prisma.question.upsert({
    include: {
      options: true,
    },
    where: { id: questionId || "sq" },
    update: {
      description: questionData.description,
      type: questionData.type,
      options:
        questionData.type !== QuestionType.textbox
          ? {
              deleteMany: {
                id: {
                  notIn: (questionData as MultiChoiceQuestion).options
                    .filter((option) => option.id !== undefined)
                    .map((option) => option.id!),
                },
              },
              upsert: (questionData as MultiChoiceQuestion).options.map(
                (option) => ({
                  where: { id: option.id || "dlsl" },
                  create: {
                    description: option.description,
                  },
                  update: { description: option.description },
                })
              ),
            }
          : undefined,
    },
    create: {
      description: questionData.description,
      type: questionData.type,
      quiz: { connect: { id: quizId } },
      options:
        questionData.type !== QuestionType.textbox
          ? {
              create: (questionData as MultiChoiceQuestion).options.map(
                (option) => ({ description: option.description })
              ),
            }
          : undefined,
    },
  });

  return savedQuestion;
};
