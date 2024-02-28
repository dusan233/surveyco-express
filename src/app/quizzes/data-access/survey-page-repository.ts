import { Prisma } from "@prisma/client";
import prisma from "../../../prismaClient";

export const getSurveyPages = async (surveyId: string) => {
  const pages = await prisma.surveyPage.findMany({
    where: { survey: { id: surveyId } },
    orderBy: { number: "asc" },
  });

  return pages;
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
