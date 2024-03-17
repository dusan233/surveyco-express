import { Prisma } from "@prisma/client";
import prisma from "../../../prismaClient";
import { assertPageExists } from "../domain/validators";
import {
  OperationPosition,
  PlacePageDTO,
  QuestionType,
} from "../../../types/types";
import { assertMaxPagesNotExceeded } from "../domain/survey-page-validators";

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

export const moveSurveyPage = async (movePageData: PlacePageDTO) => {
  return await prisma.$transaction(
    async (tx) => {
      const sourcePagePromise = tx.surveyPage.findUnique({
        where: {
          id: movePageData.sourcePageId,
          surveyId: movePageData.surveyId,
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
          id: movePageData.targetPageId,
          surveyId: movePageData.surveyId,
        },
      });
      const surveyQuestionCountPromise = await tx.question.count({
        where: { quizId: movePageData.surveyId },
      });
      const [sourcePage, targetPage, surveyQuestionCount] = await Promise.all([
        sourcePagePromise,
        targetPagePromise,
        surveyQuestionCountPromise,
      ]);
      assertPageExists(sourcePage);
      assertPageExists(targetPage);

      const sourcePageNumIsBigger = sourcePage!.number > targetPage!.number;
      const updatedSourcePageNumber = sourcePageNumIsBigger
        ? movePageData.position === OperationPosition.after
          ? targetPage!.number + 1
          : targetPage!.number
        : sourcePage!.number < targetPage!.number
        ? movePageData.position === OperationPosition.after
          ? targetPage!.number
          : targetPage!.number - 1
        : sourcePage!.number;

      if (sourcePageNumIsBigger) {
        await tx.surveyPage.updateMany({
          where: {
            number:
              movePageData.position === OperationPosition.after
                ? {
                    gt: targetPage!.number,
                    lt: sourcePage!.number,
                  }
                : {
                    gte: targetPage!.number,
                    lt: sourcePage!.number,
                  },
          },
          data: {
            number: { increment: 1 },
          },
        });
        const pagesBeforeUpdatedPageWithQuestionCount =
          await tx.surveyPage.findMany({
            where: {
              survey: { id: movePageData.surveyId },
              number: { lt: updatedSourcePageNumber },
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
        const firstPageWithQuestionsBeforeTargetPageId =
          pagesBeforeUpdatedPageWithQuestionCount.find(
            (page) => page._count.questions > 0
          )?.id;
        const startingPointQuestion = firstPageWithQuestionsBeforeTargetPageId
          ? await tx.question.findFirst({
              where: {
                surveyPage: { id: firstPageWithQuestionsBeforeTargetPageId },
              },
              orderBy: { number: "desc" },
            })
          : undefined;

        await tx.question.updateMany({
          where: {
            quizId: movePageData.surveyId,
            number: {
              gt: startingPointQuestion ? startingPointQuestion.number : 0,
              lt: sourcePage!.questions[0].number,
            },
          },
          data: {
            number: { increment: sourcePage!.questions.length },
          },
        });
        await Promise.all(
          sourcePage!.questions.map((q, index) =>
            tx.question.update({
              where: { id: q.id },
              data: {
                number: startingPointQuestion
                  ? startingPointQuestion.number + index + 1
                  : index + 1,
              },
            })
          )
        );
      } else if (sourcePage!.number < targetPage!.number) {
        await tx.surveyPage.updateMany({
          where: {
            number: {
              gt: sourcePage!.number,
              lte:
                movePageData.position === OperationPosition.after
                  ? targetPage!.number
                  : targetPage!.number - 1,
            },
          },
          data: {
            number: { decrement: 1 },
          },
        });
        const pagesAfterUpdatedPageWithQuestionCount =
          await tx.surveyPage.findMany({
            where: {
              survey: { id: movePageData.surveyId },
              number: { gt: updatedSourcePageNumber },
            },
            include: {
              _count: {
                select: {
                  questions: true,
                },
              },
            },
            orderBy: {
              number: "asc",
            },
          });
        const firstPageWithQuestionsAfterTargetPageId =
          pagesAfterUpdatedPageWithQuestionCount.find(
            (page) => page._count.questions > 0
          )?.id;
        const startingPointQuestion = firstPageWithQuestionsAfterTargetPageId
          ? await tx.question.findFirst({
              where: {
                surveyPage: { id: firstPageWithQuestionsAfterTargetPageId },
              },
              orderBy: { number: "asc" },
            })
          : undefined;

        await tx.question.updateMany({
          where: {
            quizId: movePageData.surveyId,
            number: {
              gt: sourcePage!.questions[sourcePage!.questions.length - 1]
                .number,
              lt: startingPointQuestion
                ? startingPointQuestion.number
                : surveyQuestionCount + 1,
            },
          },
          data: {
            number: { decrement: sourcePage!.questions.length },
          },
        });
        await Promise.all(
          sourcePage!.questions.map((q, index) =>
            tx.question.update({
              where: { id: q.id },
              data: {
                number: startingPointQuestion
                  ? startingPointQuestion.number -
                    sourcePage!.questions.length +
                    index
                  : surveyQuestionCount +
                    1 -
                    sourcePage!.questions.length +
                    index,
              },
            })
          )
        );
      }

      const updatedPage = await tx.surveyPage.update({
        where: { id: sourcePage!.id },
        data: {
          number: updatedSourcePageNumber,
        },
      });

      await tx.quiz.update({
        where: { id: movePageData.surveyId },
        data: { updated_at: updatedPage.updated_at },
      });

      return updatedPage;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
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
                        number: option.number,
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
export const getPageCountBySurveyId = async (surveyId: string) => {
  return await prisma.surveyPage.count({
    where: { surveyId },
  });
};

export const createSurveyPage = async (surveyId: string) => {
  return prisma.$transaction(
    async (tx) => {
      const surveyPageCount = await tx.surveyPage.count({
        where: { surveyId },
      });
      assertMaxPagesNotExceeded(surveyPageCount);

      const createdPage = await tx.surveyPage.create({
        data: {
          number:
            (await tx.surveyPage.count({
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
