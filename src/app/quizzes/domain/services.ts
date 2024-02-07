import { Prisma, Question } from "@prisma/client";
import prisma from "../../../prismaClient";
import {
  CollectorType,
  CreateQuizData,
  HttpStatusCode,
  MultiChoiceQuestion,
  OperationPosition,
  QuestionType,
  Question as Questione,
  SaveSurveyResponseRequestBody,
  SurveyStatus,
} from "../../../types/types";
import { AppError } from "../../../lib/errors";

export const createSurvey = async (userId: string, data: CreateQuizData) => {
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

export const getSurveyResponse = async (
  surveyId: string,
  responseId: string
) => {
  return await prisma.surveyResponse.findUnique({
    where: { id: responseId, surveyId },
    include: {
      collector: true,
    },
  });
};

export const getSurveyResponses = async (
  surveyId: string,
  page: number,
  sort: { column: string; type: "asc" | "desc" }
) => {
  const take = 30;
  const skip = (page - 1) * take;
  const orderBy =
    sort.column === "collector"
      ? { collector: { name: sort.type } }
      : { [sort.column]: sort.type };
  return await prisma.surveyResponse.findMany({
    where: { surveyId },
    orderBy: [orderBy, { display_number: "asc" }],
    take,
    skip,
    include: {
      collector: true,
    },
  });
};

export const getSurveyCollectors = async (
  surveyId: string,
  page: number,
  sort: { column: string; type: "asc" | "desc" },
  take: number
) => {
  const skip = (page - 1) * take;
  const orderBy =
    sort.column === "total_responses"
      ? { responses: { _count: sort.type } }
      : { [sort.column]: sort.type };

  return await prisma.surveyCollector.findMany({
    where: { surveyId, deleted: { not: true } },
    skip,
    take,
    orderBy: [orderBy, { created_at: "asc" }],
    include: {
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });
};

export const getQuestionsResult = async (
  surveyId: string,
  questionIds: string[]
) => {
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    orderBy: { number: "asc" },
    include: { options: true },
  });

  const totalSurveyResponses = await prisma.surveyResponse.count({
    where: { surveyId },
  });

  const questionResponses = await prisma.questionResponse.groupBy({
    by: ["questionId"],
    where: {
      questionId: {
        in: questions.map((q) => q.id),
      },
    },
    _count: true,
  });

  const choiceResponses = await prisma.questionAnswer.groupBy({
    by: ["questionOptionId"],
    where: {
      questionId: {
        in: questions
          .filter((q) => q.type !== QuestionType.textbox)
          .map((q) => q.id),
      },
    },

    _count: true,
  });

  const textboxResponses = (
    await Promise.all(
      questions
        .filter((q) => q.type == QuestionType.textbox)
        .map((q) =>
          prisma.questionAnswer.findMany({
            where: { questionId: q.id },
            orderBy: {
              created_at: "asc",
            },
            take: 20,
          })
        )
    )
  ).flat();

  const questionsResults = questions.map((q) => {
    const questionResponsesCount =
      questionResponses.find((qRes) => qRes.questionId === q.id)?._count || 0;
    if (q.type === QuestionType.textbox) {
      return {
        ...q,
        answeredCount: questionResponsesCount,
        skippedCount: totalSurveyResponses - questionResponsesCount,
        answers: textboxResponses
          .filter((answer) => answer.questionId === q.id)
          .map((answer) => ({
            id: answer.id,
            questionResponseId: answer.questionResponseId,
            text: answer.textAnswer,
            updated_at: answer.updated_at,
          })),
      };
    } else {
      return {
        ...q,
        answeredCount: questionResponsesCount,
        skippedCount: totalSurveyResponses - questionResponsesCount,
        choices: q.options.map((qChoice) => {
          const choiceResponsesCount =
            choiceResponses.find((cRes) => cRes.questionOptionId === qChoice.id)
              ?._count || 0;
          return {
            ...qChoice,
            answeredCount: choiceResponsesCount,
          };
        }),
      };
    }
  });

  return questionsResults;
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
    orderBy: { number: "asc" },
    include: {
      options: true,
    },
  });

  return questions;
};

export const getQuestion = async (questionId: string) => {
  return await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      options: true,
    },
  });
};

export const deleteQuestion = async (question: {
  id: string;
  number: number;
  quizId: string;
}) => {
  return await prisma.$transaction(async (tx) => {
    await tx.questionOption.deleteMany({
      where: {
        question: {
          id: question.id,
        },
      },
    });
    const deletedQuestion = await tx.question.delete({
      where: { id: question.id },
    });

    await updateQuestionsNumber(question.quizId, question.number, "decrement");

    await tx.quiz.update({
      where: { id: question.quizId },
      data: { updated_at: new Date() },
    });

    return deletedQuestion;
  });
};

export const deleteSurveyPage = async (surveyId: string, pageId: string) => {
  return await prisma.$transaction(async (tx) => {
    const targetSurveyPage = await tx.surveyPage.findUnique({
      where: { id: pageId, survey: { id: surveyId } },
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    if (!targetSurveyPage) {
      throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);
    }

    if (targetSurveyPage?._count.questions !== 0) {
      const deleteQuestions = await tx.question.findMany({
        where: { quiz: { id: surveyId }, surveyPage: { id: pageId } },
        select: { id: true, number: true },
        orderBy: { number: "asc" },
      });

      const deleteQuestionsIds = deleteQuestions.map((q) => q.id);
      const targetSurveyPageLastQuestion =
        deleteQuestions[deleteQuestions.length - 1];

      await tx.questionOption.deleteMany({
        where: { question: { id: { in: deleteQuestionsIds } } },
      });
      const deletedQuestions = await tx.question.deleteMany({
        where: { id: { in: deleteQuestionsIds } },
      });
      const deletedQuestionsCount = deletedQuestions.count;

      await tx.question.updateMany({
        where: {
          quiz: { id: surveyId },
          number: { gt: targetSurveyPageLastQuestion.number },
        },
        data: {
          number: {
            decrement: deletedQuestionsCount,
          },
        },
      });
    }

    await tx.surveyPage.updateMany({
      where: {
        survey: { id: surveyId },
        number: { gt: targetSurveyPage.number },
      },
      data: {
        number: { decrement: 1 },
      },
    });
    const deletedSurveyPage = await tx.surveyPage.delete({
      where: { survey: { id: surveyId }, id: pageId },
    });

    await tx.quiz.update({
      where: { id: surveyId },
      data: { updated_at: new Date() },
    });

    return deletedSurveyPage;
  });
};

export const copySurveyPage = async (
  surveyId: string,
  sourcePageId: string,
  position: OperationPosition,
  targetPageId: string
) => {
  return await prisma.$transaction(async (tx) => {
    const sourcePagePromise = tx.surveyPage.findUnique({
      where: { id: sourcePageId, surveyId: surveyId },
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
      where: { id: targetPageId, surveyId: surveyId },
    });

    const [sourcePage, targetPage] = await Promise.all([
      sourcePagePromise,
      targetPagePromise,
    ]);

    if (!sourcePage || !targetPage)
      throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

    const newPageNumber =
      position === OperationPosition.after
        ? targetPage.number + 1
        : targetPage.number;

    const pagesWithQuestionCount = await tx.surveyPage.findMany({
      where: {
        survey: { id: surveyId },
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
    const firstPageBeforeWithQuestions = pagesWithQuestionCount.find(
      (page) => page._count.questions > 0
    )?.id;
    const questionBeforeFirstNewQuestion = await tx.question.findFirst({
      where: { surveyPage: { id: firstPageBeforeWithQuestions } },
      orderBy: { number: "desc" },
    });

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
          increment: sourcePage.questions.length,
        },
      },
    });

    const createdPage = await tx.surveyPage.create({
      data: {
        number: newPageNumber,
        survey: {
          connect: {
            id: sourcePage.surveyId,
          },
        },
        questions: {
          create: sourcePage.questions.map((q, index) => ({
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
      where: { id: surveyId },
      data: { updated_at: createdPage.created_at },
    });

    return createdPage;
  });
};

export const moveSurveyPage = async (
  surveyId: string,
  sourcePageId: string,
  position: OperationPosition,
  targetPageId: string
) => {
  return await prisma.$transaction(async (tx) => {
    const sourcePagePromise = tx.surveyPage.findUnique({
      where: { id: sourcePageId, surveyId: surveyId },
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
      where: { id: targetPageId, surveyId: surveyId },
      include: {
        questions: {
          include: {
            options: true,
          },
          orderBy: { number: "asc" },
        },
      },
    });

    const [sourcePage, targetPage] = await Promise.all([
      sourcePagePromise,
      targetPagePromise,
    ]);

    if (!sourcePage || !targetPage)
      throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

    const sourcePageNumIsBigger = sourcePage.number > targetPage.number;
    const newPageNumber = sourcePageNumIsBigger
      ? position === OperationPosition.after
        ? targetPage.number + 1
        : targetPage.number
      : position === OperationPosition.after
      ? targetPage.number
      : targetPage.number - 1;

    if (sourcePageNumIsBigger) {
      await tx.surveyPage.updateMany({
        where: {
          number:
            position === OperationPosition.after
              ? {
                  gt: targetPage.number,
                  lt: sourcePage.number,
                }
              : {
                  gte: targetPage.number,
                  lt: sourcePage.number,
                },
        },
        data: {
          number: { increment: 1 },
        },
      });
    } else {
      await tx.surveyPage.updateMany({
        where: {
          number: {
            gt: sourcePage.number,
            lte:
              position === OperationPosition.after
                ? targetPage.number
                : targetPage.number - 1,
          },
        },
        data: {
          number: { decrement: 1 },
        },
      });
    }

    if (sourcePageNumIsBigger) {
      const pagesWithQuestionCount = await tx.surveyPage.findMany({
        where: {
          survey: { id: surveyId },
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
      const firstPageWithQuestionsBeforeTargetPage =
        pagesWithQuestionCount.find((page) => page._count.questions > 0)?.id;
      const startingPointQuestion = await tx.question.findFirst({
        where: { surveyPage: { id: firstPageWithQuestionsBeforeTargetPage } },
        orderBy: { number: "desc" },
      });
      const startingPointNumber = startingPointQuestion
        ? startingPointQuestion.number
        : 0;
      await tx.question.updateMany({
        where: {
          quizId: surveyId,
          number: {
            gt: startingPointNumber,
            lt: sourcePage.questions[0].number,
          },
        },
        data: {
          number: { increment: sourcePage.questions.length },
        },
      });
      await Promise.all(
        sourcePage.questions.map((q, index) =>
          tx.question.update({
            where: { id: q.id },
            data: {
              number: startingPointNumber + index + 1,
            },
          })
        )
      );
    } else {
      const pagesWithQuestionCount = await tx.surveyPage.findMany({
        where: {
          survey: { id: surveyId },
          id: { not: sourcePage.id },
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
      const firstPageWithQuestionsBeforeSourcePage =
        pagesWithQuestionCount.find(
          (page) => page._count.questions > 0 && page.number < sourcePage.number
        )?.id;
      const startingPointQuestion = await tx.question.findFirst({
        where: { surveyPage: { id: firstPageWithQuestionsBeforeSourcePage } },
        orderBy: { number: "desc" },
      });
      const startingPointNumber = startingPointQuestion
        ? startingPointQuestion.number
        : 0;

      const firstPageWithQuestionsBeforeMovedPage = pagesWithQuestionCount.find(
        (page) => page._count.questions > 0 && page.number < newPageNumber
      )?.id;
      const startingPoint2Question = await tx.question.findFirst({
        where: { surveyPage: { id: firstPageWithQuestionsBeforeMovedPage } },
        orderBy: { number: "desc" },
      });
      const startPoint2 = startingPoint2Question
        ? startingPoint2Question.number
        : 0;

      await tx.question.updateMany({
        where: {
          quizId: surveyId,
          number: { gt: startingPointNumber, lte: startPoint2 },
        },
        data: {
          number: { decrement: sourcePage.questions.length },
        },
      });

      const startingPoint3Question = await tx.question.findFirst({
        where: { surveyPage: { id: firstPageWithQuestionsBeforeMovedPage } },
        orderBy: { number: "desc" },
      });

      const startPoint3 = startingPoint3Question
        ? startingPoint3Question.number
        : 0;

      await Promise.all(
        sourcePage.questions.map((q, index) =>
          tx.question.update({
            where: { id: q.id },
            data: {
              number: startPoint3 + index + 1,
            },
          })
        )
      );
    }

    const movedPage = await tx.surveyPage.update({
      where: { id: sourcePageId },
      data: {
        number: newPageNumber,
      },
    });

    await tx.quiz.update({
      where: { id: surveyId },
      data: { updated_at: movedPage.updated_at },
    });

    return movedPage;
  });
};

export const createSurveyPage = async (surveyId: string) => {
  return prisma.$transaction(async (tx) => {
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

export const getSurveyResponseCount = async (surveyId: string) => {
  return await prisma.surveyResponse.count({ where: { surveyId } });
};

export const getSurveyCollectorCount = async (surveyId: string) => {
  return await prisma.surveyCollector.count({ where: { surveyId } });
};

export const getSurveyResponseQuestionResponses2 = async (
  surveyResponseId: string,
  surveyId: string,
  page: number
) => {
  const questions = await getQuestions(surveyId, page);
  const questionIds = questions.map((q) => q.id);
  return prisma.questionResponse.findMany({
    include: {
      answer: true,
    },
    where: {
      surveyResponseId,
      questionId: {
        in: questionIds,
      },
    },
  });
};

export const getSurveyResponseQuestionResponses = async (
  surveyResponseId: string,
  questionIds: string[]
) => {
  return prisma.questionResponse.findMany({
    include: {
      answer: true,
    },
    where: {
      surveyResponseId,
      questionId: {
        in: questionIds,
      },
    },
  });
};

export const checkIfSurveyResponseSubmitted = async (
  data: SaveSurveyResponseRequestBody
) => {};

export const saveSurveyResponse = async (
  data: SaveSurveyResponseRequestBody,
  collectorId: string,
  surveyId: string,
  complete: boolean,
  responderIPAddress: string,
  surveyResponseId?: string
) => {
  const filledQuestionsResponses = data.questionResponses.filter(
    (response) => response.answer.length !== 0
  );

  const newQuestionsResponses = data.questionResponses.filter(
    (response) => response.answer.length !== 0 && !response.id
  );
  const surveyResponse = await prisma.surveyResponse.upsert({
    where: { id: surveyResponseId || "" },
    create: {
      collector: {
        connect: {
          id: collectorId,
        },
      },
      survey: {
        connect: {
          id: surveyId,
        },
      },
      ip_address: responderIPAddress,
      status: complete ? "complete" : "incomplete",
      display_number:
        (await prisma.surveyResponse.count({ where: { surveyId } })) + 1,
      questionResponses: {
        create: newQuestionsResponses.map((questionResponse) => ({
          question: {
            connect: { id: questionResponse.questionId },
          },
          answer: {
            create:
              questionResponse.questionType === QuestionType.textbox
                ? [
                    {
                      question: {
                        connect: { id: questionResponse.questionId },
                      },
                      textAnswer: questionResponse.answer as string,
                    },
                  ]
                : typeof questionResponse.answer === "string"
                ? [
                    {
                      question: {
                        connect: { id: questionResponse.questionId },
                      },
                      questionOption: {
                        connect: { id: questionResponse.answer },
                      },
                    },
                  ]
                : questionResponse.answer.map((answer) => ({
                    question: {
                      connect: { id: questionResponse.questionId },
                    },
                    questionOption: {
                      connect: { id: answer },
                    },
                  })),
          },
        })),
      },
    },
    update: {
      status: complete ? "complete" : "incomplete",
      questionResponses: {
        upsert: filledQuestionsResponses.map((questionResponse) => ({
          where: { id: questionResponse.id || "" },
          create: {
            question: {
              connect: { id: questionResponse.questionId },
            },
            answer: {
              create:
                questionResponse.questionType === QuestionType.textbox
                  ? [
                      {
                        question: {
                          connect: { id: questionResponse.questionId },
                        },
                        textAnswer: questionResponse.answer as string,
                      },
                    ]
                  : typeof questionResponse.answer === "string"
                  ? [
                      {
                        question: {
                          connect: { id: questionResponse.questionId },
                        },
                        questionOption: {
                          connect: { id: questionResponse.answer },
                        },
                      },
                    ]
                  : questionResponse.answer.map((answer) => ({
                      question: {
                        connect: { id: questionResponse.questionId },
                      },
                      questionOption: {
                        connect: { id: answer },
                      },
                    })),
            },
          },
          update: {
            answer: {
              deleteMany: {},
              create:
                questionResponse.questionType === QuestionType.textbox
                  ? [
                      {
                        question: {
                          connect: { id: questionResponse.questionId },
                        },
                        textAnswer: questionResponse.answer as string,
                      },
                    ]
                  : typeof questionResponse.answer === "string"
                  ? [
                      {
                        question: {
                          connect: { id: questionResponse.questionId },
                        },
                        questionOption: {
                          connect: { id: questionResponse.answer },
                        },
                      },
                    ]
                  : questionResponse.answer.map((answer) => ({
                      question: {
                        connect: { id: questionResponse.questionId },
                      },
                      questionOption: {
                        connect: { id: answer },
                      },
                    })),
            },
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
    orderBy: { number: "asc" },
    include: {
      _count: {
        select: {
          questions: true,
        },
      },
    },
  });

  return pages;
};

export const updateQuestion = async (data: Questione, surveyId: string) => {
  const { id: questionId, ...questionData } = data;

  return prisma.$transaction(async (tx) => {
    const updatedQuestion = await tx.question.update({
      include: { options: true },
      where: { id: questionId },
      data: {
        description: questionData.description,
        description_image: questionData.descriptionImage,
        required: questionData.required,
        type: questionData.type,
        randomize:
          questionData.type !== QuestionType.textbox
            ? (questionData as MultiChoiceQuestion).randomize
            : undefined,
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
                      description_image: option.descriptionImage,
                    },
                    update: {
                      description: option.description,
                      description_image: option.descriptionImage,
                    },
                  })
                ),
              }
            : undefined,
      },
    });

    await tx.quiz.update({
      where: { id: surveyId },
      data: { updated_at: updatedQuestion.updated_at },
    });

    return updatedQuestion;
  });
};

export const createQuestion = async (
  data: Questione,
  surveyId: string,
  pageId: string
) => {
  const { id: questionId, ...questionData } = data;

  const createdQuestion = await prisma.$transaction(async (tx) => {
    const targetSurveyPage = await tx.surveyPage.findUnique({
      where: { id: pageId },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    let newQuestionNumber: number;
    if (!targetSurveyPage || targetSurveyPage._count.questions === 50)
      throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);
    if (targetSurveyPage._count.questions === 0) {
      const pagesWithQuestionCount = await tx.surveyPage.findMany({
        where: {
          survey: { id: surveyId },
          number: { lt: targetSurveyPage.number },
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
        where: { surveyPage: { id: pageId } },
        orderBy: { number: "desc" },
      });
      newQuestionNumber = targetSurveyPageLastQuestion!.number + 1;
    }

    await tx.question.updateMany({
      where: { quiz: { id: surveyId }, number: { gte: newQuestionNumber } },
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
        description: questionData.description,
        description_image: questionData.descriptionImage,
        type: questionData.type,
        required: questionData.required,
        quiz: { connect: { id: surveyId } },
        surveyPage: { connect: { id: pageId } },
        number: newQuestionNumber,
        randomize:
          questionData.type !== QuestionType.textbox
            ? (questionData as MultiChoiceQuestion).randomize
            : undefined,
        options:
          questionData.type !== QuestionType.textbox
            ? {
                create: (questionData as MultiChoiceQuestion).options.map(
                  (option) => ({
                    description: option.description,
                    description_image: option.descriptionImage,
                  })
                ),
              }
            : undefined,
      },
    });

    await tx.quiz.update({
      where: { id: surveyId },
      data: { updated_at: newQuestion.created_at },
    });

    return newQuestion;
  });

  return createdQuestion;
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
      description_image: questionData.descriptionImage,
      required: questionData.required,
      type: questionData.type,
      quiz: { connect: { id: quizId } },
      surveyPage: { connect: { id: pageId } },
      number: (await getSurveyPageQuestionsCount(quizId, pageId)) + 1,
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

export const getSurveyPagesCount = async (surveyId: string) => {
  return await prisma.surveyPage.count({
    where: { surveyId },
  });
};

export const getSurveyStatus = async (surveyId: string) => {
  const collectorsDistinctStatuses = (
    await prisma.surveyCollector.findMany({
      where: { deleted: false, surveyId },
      distinct: ["status"],
      select: { status: true },
    })
  ).map((collector) => collector.status);

  if (collectorsDistinctStatuses.length === 0) {
    return SurveyStatus.draft;
  }

  if (collectorsDistinctStatuses.includes(SurveyStatus.open)) {
    return SurveyStatus.open;
  } else {
    return SurveyStatus.close;
  }
};

export const getSurveyQuestionCount = async (surveyId: string) => {
  return await prisma.question.count({ where: { quizId: surveyId } });
};

export const getSurveyPageQuestionsCount = async (
  surveyId: string,
  pageId: string
) => {
  return await prisma.question.count({
    where: {
      quiz: {
        id: surveyId,
      },
      surveyPage: {
        id: pageId,
      },
    },
  });
};
