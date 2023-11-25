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
      surveyPages: {
        create: {
          number: 1,
        },
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
        prisma.questionAnswer.groupBy({
          by: ["questionOptionId"],
          where: {
            questionId: question.id,
          },
          _count: {
            questionOptionId: true,
          },
        })
      );
    }
  });

  return await Promise.all(questionResponsePromises);
};

export const getQuestions = async (
  surveyId: string,
  page: number,
  skip: number = 0,
  take: number = 50
) => {
  const questions = await prisma.question.findMany({
    where: {
      quizId: surveyId,
      surveyPage: { number: page },
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

export const getQuestion = async (questionId: string) => {
  return await prisma.question.findUnique({
    where: { id: questionId },
  });
};

export const deleteQuestion = async (question: {
  id: string;
  number: number;
  quizId: string;
}) => {
  return await prisma.$transaction(async (tx) => {
    const deletedQuestion = await tx.question.delete({
      where: { id: question.id },
    });
    await tx.questionOption.deleteMany({
      where: {
        question: {
          id: question.id,
        },
      },
    });

    await updateQuestionsNumber(question.quizId, question.number, "decrement");

    return deletedQuestion;
  });
};

export const createSurveyPage = async (surveyId: string) => {
  return await prisma.surveyPage.create({
    data: {
      number:
        (await prisma.surveyPage.count({
          where: { survey: { id: surveyId } },
        })) + 1,
      survey: {
        connect: {
          id: surveyId,
        },
      },
    },
  });
};

export const updateQuestionsNumber = async (
  surveyId: string,
  startingQuestionNumber: number,
  action: "increment" | "decrement"
) => {
  return prisma.question.updateMany({
    where: { number: { gt: startingQuestionNumber }, quiz: { id: surveyId } },
    data: {
      number: {
        ...(action === "increment" ? { increment: 1 } : { decrement: 1 }),
      },
    },
  });
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
  // const questionResponses: { questionId: string; answer: string }[] = [];
  const filteredResponses = data.responses.filter(
    (response) => response.answer.length !== 0
  );
  // filteredResponses.forEach((qResponse) =>
  //   typeof qResponse.answer === "string"
  //     ? questionResponses.push({
  //         questionId: qResponse.id,
  //         answer: qResponse.answer,
  //       })
  //     : qResponse.answer.forEach((answer) =>
  //         questionResponses.push({ questionId: qResponse.id, answer })
  //       )
  // );

  const surveyResponse = await prisma.surveyResponse.create({
    data: {
      collector: {
        connect: {
          id: collectorId,
        },
      },
      questionResponses: {
        create: filteredResponses.map((question) => ({
          question: {
            connect: { id: question.id },
          },
          answer: {
            create:
              question.type === QuestionType.textbox
                ? [
                    {
                      question: {
                        connect: { id: question.id },
                      },
                      textAnswer: question.answer as string,
                    },
                  ]
                : typeof question.answer === "string"
                ? [
                    {
                      question: {
                        connect: { id: question.id },
                      },
                      questionOption: {
                        connect: { id: question.answer },
                      },
                    },
                  ]
                : question.answer.map((answer) => ({
                    question: {
                      connect: { id: question.id },
                    },
                    questionOption: {
                      connect: { id: answer },
                    },
                  })),
          },
        })),
      },
    },
  });

  return surveyResponse;
};

export const getSurveyPages = async (surveyId: string) => {
  const pages = await prisma.surveyPage.findMany({
    where: { survey: { id: surveyId } },
  });

  return pages;
};

export const saveQuestion = async (
  data: Questione,
  quizId: string,
  pageId: string
) => {
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
      surveyPage: { connect: { id: pageId } },
      number: (await getSurveyQuestionsCount(quizId)) + 1,
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

export const getSurveyQuestionsCount = async (surveyId: string) => {
  return await prisma.question.count({
    where: {
      quiz: {
        id: surveyId,
      },
    },
  });
};
