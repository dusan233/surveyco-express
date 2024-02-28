import { Prisma } from "@prisma/client";
import prisma from "../../../prismaClient";
import {
  CreateQuestionDTO,
  QuestionType,
  UpdateQuestionDTO,
} from "../../../types/types";
import { assertMaxQuestionsPerPageNotExceeded } from "../domain/survey-page-validators";
import {
  assertPageBelongsToSurvey,
  assertPageExists,
} from "../domain/validators";

export const getQuestionsByPageId = async (
  surveyId: string,
  pageId: string
) => {
  const questions = await prisma.question.findMany({
    where: {
      quizId: surveyId,
      surveyPage: { id: pageId },
    },
    orderBy: { number: "asc" },
    include: {
      options: true,
    },
  });

  return questions;
};

export const getQuestionById = async (questionId: string) => {
  return await prisma.question.findUnique({ where: { id: questionId } });
};

export const getLastQuestionForPage = async (pageId: string) => {
  return await prisma.question.findFirst({
    where: { surveyPageId: pageId },
    orderBy: { number: "desc" },
  });
};

export const getQuestionCountByPageId = async (pageId: string) => {
  return await prisma.question.count({ where: { surveyPageId: pageId } });
};

export const deleteQuestion = async (questionId: string) => {
  return await prisma.$transaction(
    async (tx) => {
      await tx.questionAnswer.deleteMany({
        where: { questionId },
      });
      await tx.questionResponse.deleteMany({
        where: { questionId },
      });
      await tx.questionOption.deleteMany({
        where: { questionId },
      });
      const deletedQuestion = await tx.question.delete({
        where: { id: questionId },
      });

      await tx.question.updateMany({
        where: {
          number: { gt: deletedQuestion.number },
          quizId: deletedQuestion.quizId,
        },
        data: {
          number: { decrement: 1 },
        },
      });

      await tx.quiz.update({
        where: { id: deletedQuestion.quizId },
        data: { updated_at: new Date() },
      });

      return deletedQuestion;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
};

export const updateQuestion = async (updateQuestion: UpdateQuestionDTO) => {
  return await prisma.$transaction(
    async (tx) => {
      const updatedQuestion = await tx.question.update({
        include: { options: true },
        where: { id: updateQuestion.data.id },
        data: {
          description: updateQuestion.data.description,
          description_image: updateQuestion.data.descriptionImage,
          required: updateQuestion.data.required,
          type: updateQuestion.data.type,
          randomize:
            updateQuestion.data.type !== QuestionType.textbox
              ? updateQuestion.data.randomize
              : undefined,
          options:
            updateQuestion.data.type !== QuestionType.textbox
              ? {
                  deleteMany: {
                    id: {
                      notIn: updateQuestion.data.options
                        ?.filter((option) => option.id !== undefined)
                        .map((option) => option.id!),
                    },
                  },
                  upsert: updateQuestion.data.options?.map((option) => ({
                    where: { id: option.id || "dlsl" },
                    create: {
                      description: option.description,
                      description_image: option.descriptionImage,
                    },
                    update: {
                      description: option.description,
                      description_image: option.descriptionImage,
                    },
                  })),
                }
              : undefined,
        },
      });

      await tx.quiz.update({
        where: { id: updateQuestion.surveyId },
        data: { updated_at: updatedQuestion.updated_at },
      });

      return updatedQuestion;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
};

export const addQuestion = async (createQuestion: CreateQuestionDTO) => {
  const createdQuestion = await prisma.$transaction(
    async (tx) => {
      const targetSurveyPage = await tx.surveyPage.findUnique({
        where: { id: createQuestion.pageId },
        include: {
          _count: {
            select: { questions: true },
          },
        },
      });

      let newQuestionNumber: number;

      assertPageExists(targetSurveyPage);
      assertPageBelongsToSurvey(targetSurveyPage!, createQuestion.surveyId);
      assertMaxQuestionsPerPageNotExceeded(targetSurveyPage!._count.questions);

      if (targetSurveyPage!._count.questions === 0) {
        const pagesWithQuestionCount = await tx.surveyPage.findMany({
          where: {
            survey: { id: createQuestion.surveyId },
            number: { lt: targetSurveyPage!.number },
          },

          include: {
            _count: {
              select: {
                questions: true,
              },
            },
          },
          orderBy: {
            number: "desc",
          },
        });
        const firstPageBeforeWithQuestions = pagesWithQuestionCount.find(
          (page) => page._count.questions > 0
        )?.id;
        const questionBeforeNewQuestion = await tx.question.findFirst({
          where: { surveyPage: { id: firstPageBeforeWithQuestions } },
          orderBy: { number: "desc" },
        });
        newQuestionNumber = questionBeforeNewQuestion
          ? questionBeforeNewQuestion?.number + 1
          : 1;
      } else {
        const targetSurveyPageLastQuestion = await tx.question.findFirst({
          where: { surveyPage: { id: createQuestion.pageId } },
          orderBy: { number: "desc" },
        });
        newQuestionNumber = targetSurveyPageLastQuestion!.number + 1;
      }

      await tx.question.updateMany({
        where: {
          quiz: { id: createQuestion.surveyId },
          number: { gte: newQuestionNumber },
        },
        data: {
          number: {
            increment: 1,
          },
        },
      });

      const newQuestion = await tx.question.create({
        include: {
          options: true,
        },
        data: {
          description: createQuestion.data.description,
          description_image: createQuestion.data.descriptionImage,
          type: createQuestion.data.type,
          required: createQuestion.data.required,
          quiz: { connect: { id: createQuestion.surveyId } },
          surveyPage: { connect: { id: createQuestion.pageId } },
          number: newQuestionNumber,
          randomize:
            createQuestion.data.type !== QuestionType.textbox
              ? createQuestion.data.randomize
              : undefined,
          options:
            createQuestion.data.type !== QuestionType.textbox
              ? {
                  create: createQuestion.data.options?.map((option) => ({
                    description: option.description,
                    description_image: option.descriptionImage,
                  })),
                }
              : undefined,
        },
      });

      await tx.quiz.update({
        where: { id: createQuestion.surveyId },
        data: { updated_at: newQuestion.created_at },
      });

      return newQuestion;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  return createdQuestion;
};
