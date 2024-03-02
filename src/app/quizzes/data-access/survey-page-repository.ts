import { Prisma } from "@prisma/client";
import prisma from "../../../prismaClient";
import { assertPageExists } from "../domain/validators";

export const getSurveyPages = async (surveyId: string) => {
  const pages = await prisma.surveyPage.findMany({
    where: { survey: { id: surveyId } },
    orderBy: { number: "asc" },
  });

  return pages;
};

export const getSurveyPageCount = async (surveyId: string) => {
  return await prisma.surveyPage.count({ where: { surveyId } });
};

export const deleteSurveyPage = async (pageId: string, surveyId: string) => {
  return await prisma.$transaction(
    async (tx) => {
      const targetSurveyPage = await tx.surveyPage.findUnique({
        where: { id: pageId, surveyId },
        include: {
          _count: {
            select: {
              questions: true,
            },
          },
        },
      });

      assertPageExists(targetSurveyPage);

      if (targetSurveyPage!._count.questions !== 0) {
        const deleteQuestions = await tx.question.findMany({
          where: { surveyPage: { id: pageId } },
          select: { id: true, number: true },
          orderBy: { number: "asc" },
        });

        const deleteQuestionsIds = deleteQuestions.map((q) => q.id);
        const targetSurveyPageLastQuestion =
          deleteQuestions[deleteQuestions.length - 1];

        await tx.questionAnswer.deleteMany({
          where: { questionId: { in: deleteQuestionsIds } },
        });
        await tx.questionResponse.deleteMany({
          where: { questionId: { in: deleteQuestionsIds } },
        });
        await tx.questionOption.deleteMany({
          where: { question: { id: { in: deleteQuestionsIds } } },
        });
        const deletedQuestions = await tx.question.deleteMany({
          where: { id: { in: deleteQuestionsIds } },
        });
        const deletedQuestionsCount = deletedQuestions.count;

        await tx.question.updateMany({
          where: {
            quiz: { id: targetSurveyPage!.surveyId },
            number: { gt: targetSurveyPageLastQuestion.number },
          },
          data: {
            number: {
              decrement: deletedQuestionsCount,
            },
          },
        });
      }

      const deletedSurveyPage = await tx.surveyPage.delete({
        where: { id: pageId },
      });

      await tx.surveyPage.updateMany({
        where: {
          survey: { id: deletedSurveyPage.surveyId },
          number: { gt: deletedSurveyPage.number },
        },
        data: {
          number: { decrement: 1 },
        },
      });

      await tx.quiz.update({
        where: { id: deletedSurveyPage.surveyId },
        data: { updated_at: new Date() },
      });

      return deletedSurveyPage;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
};

export const createSurveyPage = async (surveyId: string) => {
  return prisma.$transaction(
    async (tx) => {
      const createdPage = await prisma.surveyPage.create({
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

      await tx.quiz.update({
        where: { id: surveyId },
        data: { updated_at: createdPage.created_at },
      });

      return createdPage;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
};

export const getPagesBeforeAndQuestionCount = async (
  surveyId: string,
  startPageNumber: number
) => {
  const pagesWithQuestionCount = await prisma.surveyPage.findMany({
    where: {
      survey: { id: surveyId },
      number: { lt: startPageNumber },
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

  return pagesWithQuestionCount;
};

export const getSurveyPageById = async (pageId: string) => {
  return await prisma.surveyPage.findUnique({ where: { id: pageId } });
};
