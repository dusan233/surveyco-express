import { Prisma } from "@prisma/client";
import prisma from "../../../prismaClient";
import {
  CreateQuestionDTO,
  HttpStatusCode,
  OperationPosition,
  PlaceQuestionDTO,
  QuestionType,
  UpdateQuestionDTO,
} from "../../../types/types";
import { assertMaxQuestionsPerPageNotExceeded } from "../domain/survey-page-validators";
import {
  assertPageBelongsToSurvey,
  assertPageExists,
  assertQuestionBelongsToSurvey,
  assertQuestionExists,
} from "../domain/validators";
import { AppError } from "../../../lib/error-handling";

export const getQuestionsByPageId = async (pageId: string) => {
  const questions = await prisma.question.findMany({
    where: {
      surveyPage: { id: pageId },
    },
    orderBy: { number: "asc" },
    include: {
      options: {
        orderBy: {
          number: "asc",
        },
      },
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
      const [questionResponseCount, questionOptions] = await Promise.all([
        tx.questionResponse.count({
          where: { questionId: updateQuestion.data.id },
        }),
        tx.questionOption.findMany({
          where: { questionId: updateQuestion.data.id },
        }),
      ]);

      if (
        questionResponseCount > 0 &&
        [
          QuestionType.checkboxes,
          QuestionType.dropdown,
          QuestionType.multiple_choice,
        ].includes(updateQuestion.data.type)
      ) {
        questionOptions.forEach((qOption) => {
          const optionExistsInUpdateData = !!updateQuestion.data.options!.find(
            (option) => option.id === qOption.id
          );

          if (!optionExistsInUpdateData)
            throw new AppError(
              "BadRequest",
              "Question option cant be deleted because this question has responses.",
              HttpStatusCode.BAD_REQUEST,
              true
            );
        });
      }

      console.log(updateQuestion.data.options);

      const updatedQuestion = await tx.question.update({
        include: { options: { orderBy: { number: "asc" } } },
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
                    where: { id: option.id || "" },
                    create: {
                      description: option.description,
                      description_image: option.descriptionImage,
                      number: option.number,
                    },
                    update: {
                      description: option.description,
                      description_image: option.descriptionImage,
                      number: option.number,
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

export const moveQuestion = async (moveQuestionData: PlaceQuestionDTO) => {
  return await prisma.$transaction(
    async (tx) => {
      const targetSurveyPagePromise = tx.surveyPage.findUnique({
        where: { id: moveQuestionData.targetPageId },
        include: {
          _count: {
            select: { questions: true },
          },
        },
      });
      const moveQuestionPromise = tx.question.findUnique({
        where: { id: moveQuestionData.sourceQuestionId },
        include: { options: true },
      });

      const [targetPage, moveQuestion] = await Promise.all([
        targetSurveyPagePromise,
        moveQuestionPromise,
      ]);

      assertPageExists(targetPage);
      assertPageBelongsToSurvey(targetPage!, moveQuestionData.surveyId);
      assertQuestionExists(moveQuestion);
      assertQuestionBelongsToSurvey(moveQuestion!, moveQuestionData.surveyId);
      assertMaxQuestionsPerPageNotExceeded(targetPage!._count.questions);

      let movedQuestionNewNumber;

      if (targetPage!._count.questions !== 0) {
        if (moveQuestionData.targetQuestionId) {
          const targetQuestion = await tx.question.findUnique({
            where: {
              id: moveQuestionData.targetQuestionId,
              surveyPageId: moveQuestionData.targetPageId,
            },
          });
          assertQuestionExists(targetQuestion);

          if (targetQuestion!.number > moveQuestion!.number) {
            movedQuestionNewNumber =
              moveQuestionData.position === OperationPosition.after
                ? targetQuestion!.number
                : targetQuestion!.number - 1;
            await tx.question.updateMany({
              where: {
                quiz: { id: moveQuestionData.surveyId },
                number: {
                  gt: moveQuestion!.number,
                  lte: movedQuestionNewNumber,
                },
              },
              data: {
                number: {
                  decrement: 1,
                },
              },
            });
          } else {
            movedQuestionNewNumber =
              moveQuestionData.position === OperationPosition.after
                ? targetQuestion!.number + 1
                : targetQuestion!.number;
            await tx.question.updateMany({
              where: {
                quiz: { id: moveQuestionData.surveyId },
                number: {
                  gte: movedQuestionNewNumber,
                  lt: moveQuestion!.number,
                },
              },
              data: {
                number: {
                  increment: 1,
                },
              },
            });
          }
        } else {
          const targetPageLastQuestion = await tx.question.findFirst({
            where: { surveyPageId: moveQuestionData.targetPageId },
            orderBy: { number: "desc" },
          });

          if (targetPageLastQuestion!.number > moveQuestion!.number) {
            movedQuestionNewNumber =
              moveQuestionData.position === OperationPosition.after
                ? targetPageLastQuestion!.number
                : targetPageLastQuestion!.number - 1;

            await tx.question.updateMany({
              where: {
                quiz: { id: moveQuestionData.surveyId },
                number: {
                  gt: moveQuestion!.number,
                  lte: movedQuestionNewNumber,
                },
              },
              data: {
                number: {
                  decrement: 1,
                },
              },
            });
          } else {
            movedQuestionNewNumber =
              moveQuestionData.position === OperationPosition.after
                ? targetPageLastQuestion!.number + 1
                : targetPageLastQuestion!.number;
            await tx.question.updateMany({
              where: {
                quiz: { id: moveQuestionData.surveyId },
                number: {
                  gte: movedQuestionNewNumber,
                  lt: moveQuestion!.number,
                },
              },
              data: {
                number: {
                  increment: 1,
                },
              },
            });
          }
        }
      } else {
        const pagesBeforeTargetPageWithQuestionCount =
          await tx.surveyPage.findMany({
            where: {
              surveyId: moveQuestionData.surveyId,
              number: { lt: targetPage!.number },
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
          pagesBeforeTargetPageWithQuestionCount.find(
            (page) => page._count.questions > 0
          )?.id;

        // this means we are moving question from higher number page to lower.
        if (!firstPageBeforeWithQuestionsId) movedQuestionNewNumber = 1;
        if (firstPageBeforeWithQuestionsId) {
          const firstPageWithQuestionsLastQuestion =
            await tx.question.findFirst({
              where: { surveyPage: { id: firstPageBeforeWithQuestionsId } },
              orderBy: { number: "desc" },
            });

          if (
            moveQuestion!.number > firstPageWithQuestionsLastQuestion!.number
          ) {
            movedQuestionNewNumber =
              firstPageWithQuestionsLastQuestion!.number + 1;
            await tx.question.updateMany({
              where: {
                quiz: { id: moveQuestionData.surveyId },
                number: {
                  gte: movedQuestionNewNumber,
                  lt: moveQuestion!.number,
                },
              },
              data: {
                number: {
                  increment: 1,
                },
              },
            });
          } else {
            if (moveQuestion!.id === firstPageWithQuestionsLastQuestion!.id) {
              movedQuestionNewNumber = 1;
            } else {
              movedQuestionNewNumber =
                firstPageWithQuestionsLastQuestion!.number;
              await tx.question.updateMany({
                where: {
                  quiz: { id: moveQuestionData.surveyId },
                  number: {
                    gt: moveQuestion!.number,
                    lte: movedQuestionNewNumber,
                  },
                },
                data: {
                  number: {
                    decrement: 1,
                  },
                },
              });
            }
          }
        }
      }

      const movedQuestion = await tx.question.update({
        where: { id: moveQuestionData.sourceQuestionId },
        data: {
          number: movedQuestionNewNumber,
          surveyPage: {
            connect: { id: targetPage!.id },
          },
        },
      });

      await tx.quiz.update({
        where: { id: moveQuestionData.surveyId },
        data: { updated_at: movedQuestion.updated_at },
      });

      return movedQuestion;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
};

export const copyQuestion = async (copyQuestionData: PlaceQuestionDTO) => {
  return await prisma.$transaction(
    async (tx) => {
      const targetSurveyPagePromise = tx.surveyPage.findUnique({
        where: { id: copyQuestionData.targetPageId },
        include: {
          _count: {
            select: { questions: true },
          },
        },
      });
      const copyQuestionPromise = tx.question.findUnique({
        where: { id: copyQuestionData.sourceQuestionId },
        include: { options: true },
      });

      const [targetPage, copyQuestion] = await Promise.all([
        targetSurveyPagePromise,
        copyQuestionPromise,
      ]);

      assertPageExists(targetPage);
      assertPageBelongsToSurvey(targetPage!, copyQuestionData.surveyId);
      assertQuestionExists(copyQuestion);
      assertQuestionBelongsToSurvey(copyQuestion!, copyQuestionData.surveyId);
      assertMaxQuestionsPerPageNotExceeded(targetPage!._count.questions);

      let newQuestionNumber;

      if (targetPage!._count.questions !== 0) {
        if (copyQuestionData.targetQuestionId) {
          const targetQuestion = await tx.question.findUnique({
            where: {
              id: copyQuestionData.targetQuestionId,
              surveyPageId: copyQuestionData.targetPageId,
            },
          });
          assertQuestionExists(targetQuestion);

          newQuestionNumber =
            copyQuestionData.position === OperationPosition.after
              ? targetQuestion!.number + 1
              : targetQuestion!.number;
        } else {
          const targetPageLastQuestion = await tx.question.findFirst({
            where: { surveyPageId: copyQuestionData.targetPageId },
            orderBy: { number: "desc" },
          });

          assertQuestionExists(targetPageLastQuestion);

          newQuestionNumber = targetPageLastQuestion!.number + 1;
        }
      } else {
        const pagesBeforeTargetPageWithQuestionCount =
          await tx.surveyPage.findMany({
            where: {
              surveyId: copyQuestionData.surveyId,
              number: { lt: targetPage!.number },
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
          pagesBeforeTargetPageWithQuestionCount.find(
            (page) => page._count.questions > 0
          )?.id;
        if (firstPageBeforeWithQuestionsId) {
          const firstPageWithQuestionsLastQuestion =
            await tx.question.findFirst({
              where: { surveyPage: { id: firstPageBeforeWithQuestionsId } },
              orderBy: { number: "desc" },
            });
          newQuestionNumber = firstPageWithQuestionsLastQuestion!.number + 1;
        } else {
          newQuestionNumber = 1;
        }
      }

      await tx.question.updateMany({
        where: {
          number: { gte: newQuestionNumber },
          quiz: { id: copyQuestionData.surveyId },
        },
        data: {
          number: {
            increment: 1,
          },
        },
      });

      const newQuestion = await tx.question.create({
        data: {
          description: copyQuestion!.description,
          type: copyQuestion!.type,
          required: copyQuestion!.required,
          description_image: copyQuestion!.description_image,
          quiz: {
            connect: {
              id: copyQuestionData.surveyId,
            },
          },
          surveyPage: { connect: { id: targetPage!.id } },
          number: newQuestionNumber,
          randomize:
            copyQuestion!.type !== QuestionType.textbox
              ? copyQuestion!.randomize
              : undefined,
          options:
            copyQuestion!.type !== QuestionType.textbox
              ? {
                  create: copyQuestion!.options.map((option) => ({
                    description: option.description,
                    description_image: option.description_image,
                    number: option.number,
                  })),
                }
              : undefined,
        },
      });

      await tx.quiz.update({
        where: { id: copyQuestionData.surveyId },
        data: { updated_at: newQuestion.created_at },
      });

      return newQuestion;
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
        if (firstPageBeforeWithQuestions) {
          const questionBeforeNewQuestion = await tx.question.findFirst({
            where: { surveyPage: { id: firstPageBeforeWithQuestions } },
            orderBy: { number: "desc" },
          });
          newQuestionNumber = questionBeforeNewQuestion!.number + 1;
        } else {
          newQuestionNumber = 1;
        }
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
                    number: option.number,
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
export const getSurveyQuestionCount = async (surveyId: string) => {
  return await prisma.question.count({ where: { quizId: surveyId } });
};
