import { NextFunction, Request, Response } from "express";
import { createQuiz } from "../domain/services";
import {
  CreateQuizData,
  MultiChoiceQuestion,
  Question,
  QuestionType,
} from "../../../types/types";
import prisma from "../../../prismaClient";

const createQuizHandler = async (
  req: Request<any, any, CreateQuizData>,
  res: Response,
  next: NextFunction
) => {
  const createdQuiz = await createQuiz(req.auth.userId, req.body);
  return res.status(201).json(createdQuiz);
};

const saveQuestionHandler = async (
  req: Request<{ quizId: string }, any, Question>,
  res: Response,
  next: NextFunction
) => {
  const quizId = req.params.quizId;
  const { id: questionId, ...questionData } = req.body;

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
  return res.status(201).json(savedQuestion);
};

export default { createQuizHandler, saveQuestionHandler };
