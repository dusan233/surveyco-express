import prisma from "../../../prismaClient";
import {
  CreateSurveyData,
  HttpStatusCode,
  MultiChoiceQuestion,
  OperationPosition,
  OrderByObject,
  QuestionType,
  Question as Questione,
  SaveSurveyResponseDTO,
  SaveSurveyResponseData,
  SaveSurveyResponseRequestBody,
  SurveyCollectorsDTO,
  SurveyResponsesDTO,
  SurveyStatus,
} from "../../../types/types";
import { AppError as AppErr } from "../../../lib/error-handling/index";
import { AppError } from "../../../lib/errors";
import {
  assertPageBelongsToSurvey,
  assertPageExists,
  assertQuestionResponsesDataIsValid,
  assertSurveyExists,
  validateNewSurvey,
  validateSaveSurveyResponse,
} from "./validators";
import * as collectorService from "../../collectors/domain/services";
import * as surveyRepository from "../data-access/survey-repository";
import * as surveyResponseRepository from "../data-access/survey-response-repository";
import * as collectorRepository from "../../collectors/data-access/collectors.repository";
import * as surveyPageRepository from "../data-access/survey-page-repository";
import * as questionResponseRepository from "../data-access/question-response-repository";
import * as questionAnswerRepository from "../data-access/question-answer-repository";
import * as questionRepository from "../data-access/question-repository";
import { add, format, startOfDay } from "date-fns";
import {
  assertCollectorBelongsToSurvey,
  assertCollectorExists,
} from "../../collectors/domain/validators";

export const createSurvey = async (
  surveyData: CreateSurveyData,
  creatorId: string
) => {
  const validatedData = validateNewSurvey(surveyData);
  const newSurveyData = { ...validatedData, userId: creatorId };

  return await surveyRepository.createSurvey(newSurveyData);
};

export const getSurveyById = (surveyId: string) => {
  const survey = surveyRepository.getSurveyById(surveyId);

  return survey;
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
  return await surveyResponseRepository.getSurveyResponse(responseId, surveyId);
};

export const getSurveyResponses = async (
  surveyId: string,
  params: {
    page: number;
    sort: OrderByObject;
  }
) => {
  const take = 30;
  const skip = (params.page - 1) * take;
  const [responses, responsesCount] = await Promise.all([
    surveyResponseRepository.getSurveyResponsesBySurveyId(surveyId, {
      take,
      skip,
      sort: params.sort,
    }),
    surveyRepository.getSurveyResponseCount(surveyId),
  ]);

  const responsesData: SurveyResponsesDTO = {
    data: responses,
    total_pages: Math.ceil(responsesCount / take),
    responses_count: responsesCount,
  };

  return responsesData;
};

export const getSurveyCollectors = async (
  surveyId: string,
  params: {
    page: number;
    take: number;
    sort: OrderByObject;
  }
) => {
  const skip = (params.page - 1) * params.take;

  const [collectors, collectorCount] = await Promise.all([
    collectorRepository.getCollectorsBySurveyId(surveyId, {
      take: params.take,
      skip,
      sort: params.sort,
    }),
    collectorRepository.getCollectorCountBySurveyId(surveyId),
  ]);

  const formatedCollectors = collectors.map((collector) => ({
    id: collector.id,
    name: collector.name,
    created_at: collector.created_at,
    updated_at: collector.updated_at,
    status: collector.status,
    type: collector.type,
    surveyId: collector.surveyId,
    total_responses: collector._count.responses,
  }));

  const surveyCollectorsData: SurveyCollectorsDTO = {
    data: formatedCollectors,
    total_pages: Math.ceil(collectorCount / params.take),
    collector_count: collectorCount,
  };

  return surveyCollectorsData;
};

export const getSurveyPage = async (pageId: string) => {
  const page = await surveyPageRepository.getSurveyPageById(pageId);
  return page;
};

export const checkForSurveyUpdated = async (surveyId: string, date: Date) => {
  const isUpdated = await surveyRepository.getSurveyIfUpdated(surveyId, date);

  if (isUpdated)
    throw new AppErr(
      "Conflict",
      "Resource changed!",
      HttpStatusCode.CONFLICT,
      true
    );
};

export const getSurveyPageQuestionResults = async (
  surveyId: string,
  pageId: string
) => {
  const [questions, totalSurveyResponses] = await Promise.all([
    getPageQuestions(surveyId, pageId),
    surveyResponseRepository.getSurveyResponseCount(surveyId),
  ]);

  const questionResponses =
    await questionResponseRepository.getQuestionResponseCountPerQuestion(
      questions.map((q) => q.id)
    );

  const choiceResponseResults =
    await questionAnswerRepository.getChoiceCountPerQuestion(
      questions.filter((q) => q.type !== QuestionType.textbox).map((q) => q.id)
    );

  const textboxQuestionAnswers = (
    await Promise.all(
      questions
        .filter((q) => q.type == QuestionType.textbox)
        .map((q) => questionAnswerRepository.getQuestionAnswers(q.id))
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
        answers: textboxQuestionAnswers
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
            choiceResponseResults.find(
              (cRes) => cRes.questionOptionId === qChoice.id
            )?._count || 0;
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

export const getPageQuestions = async (surveyId: string, pageId: string) => {
  return await questionRepository.getQuestionsByPageId(pageId);
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
                      number: option.number,
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
  return await surveyRepository.getSurveyResponseCount(surveyId);
};

export const getSurveyCollectorCount = async (surveyId: string) => {
  return collectorRepository.getCollectorCountBySurveyId(surveyId);
};

export const getSurveyResponseVolume = async (surveyId: string) => {
  const currentDate = new Date();
  const tenDaysAgo = new Date(currentDate);
  tenDaysAgo.setDate(currentDate.getDate() - 10);

  const surveyResponseCountPerDay =
    await surveyResponseRepository.getSurveyResponseCountRangeDate(
      surveyId,
      tenDaysAgo.toISOString(),
      currentDate.toISOString()
    );

  const dateObjects = [];
  const startDate = new Date(tenDaysAgo);
  const endDate = new Date(currentDate);

  while (startDate <= endDate) {
    const day = format(startDate, "yyyy-MM-dd");
    const startDayDate = new Date(day);
    const endDayDate = startOfDay(add(startDayDate, { days: 1 }));

    // Set hours, minutes, and seconds to get the end of the day
    endDayDate.setUTCHours(23);
    endDayDate.setUTCMinutes(59);
    endDayDate.setUTCSeconds(59);
    endDayDate.setUTCMilliseconds(999);

    // Subtract 1 millisecond to get the end of the previous day

    let responseCount = 0;
    surveyResponseCountPerDay.forEach((resCount) => {
      if (
        resCount.created_at >= startDayDate &&
        resCount.created_at <= endDayDate
      ) {
        responseCount += resCount._count._all;
      }
    });
    dateObjects.push({
      day: format(startDate, "yyyy-MM-dd"),
      response_count: responseCount,
    });

    // Move to the next day
    startDate.setDate(startDate.getDate() + 1);
  }

  return dateObjects;
};

export const getSurveyResponseData = async (
  surveyResponseId: string,
  surveyId: string,
  pageId: string
) => {
  const questions = await questionRepository.getQuestionsByPageId(pageId);
  const questionIds = questions.map((q) => q.id);
  const questionResponses =
    await questionResponseRepository.getQuestionResponsesForSurveyResponse(
      surveyResponseId,
      questionIds
    );

  return { questions, questionResponses };
};

export const getSurveyResponseQuestionResponses = async (
  surveyResponseId: string,
  questionIds: string[]
) => {
  return await questionResponseRepository.getQuestionResponsesForSurveyResponse(
    surveyResponseId,
    questionIds
  );
};

export const checkIfSurveyResponseSubmitted = async (
  data: SaveSurveyResponseRequestBody
) => {};

export const saveSurveyResponse = async (
  surveyResponseData: SaveSurveyResponseData,
  responderIPAddress: string,
  responseId: string | null,
  surveyId: string
) => {
  const validatedData = validateSaveSurveyResponse(surveyResponseData);

  const [page, survey, pageQuestions, surveyPages] = await Promise.all([
    getSurveyPage(surveyResponseData.pageId),
    getSurveyById(surveyId),
    getPageQuestions(surveyId, surveyResponseData.pageId),
    getSurveyPages(surveyId),
  ]);
  // check if responses exist for provided ids.
  assertSurveyExists(survey);

  assertPageExists(page);
  assertPageBelongsToSurvey(page!, surveyId);
  assertQuestionResponsesDataIsValid(
    validatedData.questionResponses,
    pageQuestions
  );

  const submitting =
    surveyPages.find((page) => page.number === surveyPages.length)?.id ===
    surveyResponseData.pageId;
  // make sure all required qeustions are answered before submit complete
  if (submitting && surveyPages.length >= 2) {
  }

  await checkForSurveyUpdated(
    surveyId,
    surveyResponseData.surveyResposneStartTime
  );

  if (surveyResponseData.isPreview)
    return {
      id: "preview",
      status: submitting ? "complete" : "incomplete",
    };

  const collector = await collectorService.getSurveyCollector(
    surveyResponseData.collectorId!
  );
  assertCollectorExists(collector);
  assertCollectorBelongsToSurvey(survey!, collector!);

  const saveResponseData = {
    data: validatedData,
    collectorId: validatedData.collectorId!,
    surveyId,
    complete: submitting,
    responderIPAddress,
    surveyResponseId: responseId ?? null,
  };

  return await surveyResponseRepository.saveSurveyResponse(saveResponseData);
};

export const getSurveyPages = async (surveyId: string) => {
  const pages = await surveyPageRepository.getSurveyPages(surveyId);

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
                      number: option.number,
                    },
                    update: {
                      description: option.description,
                      description_image: option.descriptionImage,
                      number: option.number,
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
                    number: option.number,
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
                    number: option.number,
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
                (option) => ({
                  description: option.description,
                  number: option.number,
                })
              ),
            }
          : undefined,
    },
  });

  return savedQuestion;
};

export const getSurveyPagesCount = async (surveyId: string) => {
  return await surveyRepository.getSurveyPageCount(surveyId);
};

export const getSurveyStatus = async (surveyId: string) => {
  const collectorsDistinctStatuses =
    await surveyRepository.getSurveyCollectorStatuses(surveyId);

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
  return await surveyRepository.getSurveyQuestionCount(surveyId);
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
