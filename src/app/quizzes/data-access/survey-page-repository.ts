import { Prisma } from "@prisma/client";
import prisma from "../../../prismaClient";
import { assertPageExists } from "../domain/validators";
import {
  OperationPosition,
  PlacePageDTO,
  QuestionType,
} from "../../../types/types";

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

export const copySurveyPage = async (copyPageData: PlacePageDTO) => {
  return await prisma.$transaction(
    async (tx) => {
      const sourcePagePromise = tx.surveyPage.findUnique({
        where: {
          id: copyPageData.sourcePageId,
          surveyId: copyPageData.surveyId,
        },
        include: {
          questions: {
            include: {
              options: true,
            },
            orderBy: { number: "asc" },
          },
        },
      });
      const targetPagePromise = tx.surveyPage.findUnique({
        where: {
          id: copyPageData.targetPageId,
          surveyId: copyPageData.surveyId,
        },
      });
      const [sourcePage, targetPage] = await Promise.all([
        sourcePagePromise,
        targetPagePromise,
      ]);
      assertPageExists(sourcePage);
      assertPageExists(targetPage);

      const newPageNumber =
        copyPageData.position === OperationPosition.after
          ? targetPage!.number + 1
          : targetPage!.number;

      const pagesBeforeNewPageWithQuestionCount = await tx.surveyPage.findMany({
        where: {
          survey: { id: copyPageData.surveyId },
          number: { lt: newPageNumber },
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

      const firstPageBeforeWithQuestionsId =
        pagesBeforeNewPageWithQuestionCount.find(
          (page) => page._count.questions > 0
        )?.id;

      const questionBeforeFirstNewQuestion = firstPageBeforeWithQuestionsId
        ? await tx.question.findFirst({
            where: { surveyPage: { id: firstPageBeforeWithQuestionsId } },
            orderBy: { number: "desc" },
          })
        : undefined;

      await tx.surveyPage.updateMany({
        where: { number: { gte: newPageNumber } },
        data: {
          number: { increment: 1 },
        },
      });

      await tx.question.updateMany({
        where: {
          number: {
            gt: questionBeforeFirstNewQuestion
              ? questionBeforeFirstNewQuestion.number
              : 0,
          },
        },
        data: {
          number: {
            increment: sourcePage!.questions.length,
          },
        },
      });

      const createdPage = await tx.surveyPage.create({
        data: {
          number: newPageNumber,
          survey: {
            connect: {
              id: sourcePage!.surveyId,
            },
          },
          questions: {
            create: sourcePage!.questions.map((q, index) => ({
              description: q.description,
              type: q.type,
              description_image: q.description_image,
              required: q.required,
              quiz: { connect: { id: q.quizId } },
              number:
                (questionBeforeFirstNewQuestion
                  ? questionBeforeFirstNewQuestion!.number
                  : 0) +
                1 +
                index,
              randomize:
                q.type !== QuestionType.textbox ? q.randomize : undefined,
              options:
                q.type !== QuestionType.textbox
                  ? {
                      create: q.options.map((option) => ({
                        description: option.description,
                        description_image: option.description_image,
                      })),
                    }
                  : undefined,
            })),
          },
        },
      });

      await tx.quiz.update({
        where: { id: createdPage.surveyId },
        data: { updated_at: createdPage.created_at },
      });

      return createdPage;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
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
