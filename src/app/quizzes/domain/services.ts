import prisma from "../../../prismaClient";
import {
  CreateQuizData,
  MultiChoiceQuestion,
  Question,
  QuestionType,
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

export const getQuiz = async (quizId: string) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });

  return quiz;
};

export const saveQuestion = async (data: Question, quizId: string) => {
  const { id: questionId, ...questionData } = data;

  const savedQuestion = await prisma.question.upsert({
    include: {
      options: true,
    },
    where: { id: questionId || "sq" },
    update: {
      description: questionData.question_description,
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
      description: questionData.question_description,
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