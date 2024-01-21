import { NextFunction, Request, Response } from "express";
import {
  createSurvey,
  createSurveyPage,
  deleteQuestion,
  getQuestion,
  getQuestionsResult,
  getQuestions,
  getSurvey,
  getSurveyPages,
  getSurveyPageQuestionsCount,
  saveQuestion,
  saveSurveyResponse,
  updateQuestionsNumber,
  createQuestion,
  updateQuestion,
  deleteSurveyPage,
  copySurveyPage,
  moveSurveyPage,
  getSurveyResponseQuestionResponses,
  getSurveyCollectors,
  getSurveyResponseCount,
  getSurveyResponses,
  getSurveyResponse,
  getSurveyPagesCount,
} from "../domain/services";
import {
  CollectorParams,
  CollectorType,
  CreateQuizData,
  GetQuestionResultsRequestBody,
  HttpStatusCode,
  MultiChoiceQuestion,
  OperationPosition,
  PlacePageReqBody,
  PlaceQuestionReqBody,
  Question,
  QuestionType,
  SaveSurveyResponseRequestBody,
  SurveyPageParams,
  SurveyParams,
  SurveyQuestionParams,
  SurveyResponseQuestionResponsesBody,
} from "../../../types/types";
import prisma from "../../../prismaClient";
import { AppError } from "../../../lib/errors";
import { getSurveyCollector } from "../../collectors/domain/services";
import {
  add,
  addDays,
  endOfDay,
  format,
  set,
  setMilliseconds,
  startOfDay,
  sub,
  subDays,
} from "date-fns";

const createQuizHandler = async (
  req: Request<any, any, CreateQuizData>,
  res: Response
) => {
  const createdQuiz = await createSurvey(req.auth.userId, req.body);
  return res.status(201).json(createdQuiz);
};

const getSurveyHandler = async (
  req: Request<SurveyParams>,
  res: Response,
  next: NextFunction
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;
  const survey = await getSurvey(surveyId, true);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const [surveyPageCount, surveyResponseCount] = await Promise.all([
    getSurveyPagesCount(surveyId),
    getSurveyResponseCount(surveyId),
  ]);

  return res.status(200).json({
    ...survey,
    responses_count: surveyResponseCount,
    page_count: surveyPageCount,
    question_count: 25,
  });
};

const getSurveyResponsesVolumeHandler = async (
  req: Request<SurveyParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;

  const survey = await getSurvey(surveyId);
  if (!survey || survey.creatorId !== userId)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  const currentDate = new Date();
  const sevenDaysAgo = new Date(currentDate);
  sevenDaysAgo.setDate(currentDate.getDate() - 10);

  const surveyResponseCounts = await prisma.surveyResponse.groupBy({
    by: ["created_at"],
    _count: {
      _all: true,
    },
    where: {
      surveyId,
      created_at: {
        gte: sevenDaysAgo.toISOString(),
        lte: currentDate.toISOString(),
      },
    },
  });

  const dateObjects = [];
  const startDate = new Date(sevenDaysAgo);
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
    surveyResponseCounts.forEach((resCount) => {
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

  return res.status(HttpStatusCode.OK).json(dateObjects);
};

const getSurveyPagesHandler = async (
  req: Request<SurveyParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;

  const survey = await getSurvey(surveyId);
  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  const surveyPages = await getSurveyPages(surveyId);
  const formatedSurveyPages = surveyPages.map((page) => ({
    id: page.id,
    created_at: page.created_at,
    updated_at: page.updated_at,
    surveyId: page.surveyId,
    number: page.number,
    totalQuestions: page._count.questions,
  }));

  return res.status(HttpStatusCode.OK).json(formatedSurveyPages);
};

const moveQuestionHandler = async (
  req: Request<SurveyQuestionParams, any, PlaceQuestionReqBody>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const questionId = req.params.questionId;
  const userId = req.auth.userId;

  const [survey, question] = await Promise.all([
    getSurvey(surveyId),
    getQuestion(questionId),
  ]);

  if (!survey || !question)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId || question.quizId !== surveyId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const movedQuestion = await prisma.$transaction(async (tx) => {
    if (req.body.questionId && req.body.position) {
      const targetQuestionPromise = tx.question.findUnique({
        where: { id: req.body.questionId },
      });
      const targetSurveyPagePromise = tx.surveyPage.findUnique({
        where: { id: req.body.pageId },
        include: {
          _count: {
            select: { questions: true },
          },
        },
      });
      const [targetQuestion, targetSurveyPage] = await Promise.all([
        targetQuestionPromise,
        targetSurveyPagePromise,
      ]);

      if (
        !targetSurveyPage ||
        !targetQuestion ||
        targetQuestion?.surveyPageId !== req.body.pageId
      ) {
        //pitanje premesteno vrati error. Kao nesto nije u redu mozda da refresh podatke sa invalidate query.
        //ili obrisano pitanje.
        //ili obrisana stranica.
        throw new AppError(
          "",
          "Not found",
          HttpStatusCode.BAD_REQUEST,
          "",
          true
        );
      }

      if (
        targetSurveyPage._count.questions === 50 ||
        targetSurveyPage._count.questions === 0
      ) {
        //stranica puna ne moze vise
        throw new AppError(
          "",
          "Not found",
          HttpStatusCode.BAD_REQUEST,
          "",
          true
        );
      }

      let updatedQuestionNewNumber =
        req.body.position === OperationPosition.after
          ? targetQuestion.number
          : targetQuestion.number - 1;

      if (targetQuestion.number > question.number) {
        await tx.question.updateMany({
          where: {
            quiz: { id: surveyId },
            number: {
              gt: question.number,
              lte: updatedQuestionNewNumber,
            },
          },
          data: {
            number: {
              decrement: 1,
            },
          },
        });
      } else {
        updatedQuestionNewNumber =
          req.body.position === OperationPosition.before
            ? targetQuestion.number
            : targetQuestion.number + 1;
        await tx.question.updateMany({
          where: {
            quiz: { id: surveyId },
            number: {
              lt: question.number,
              gte: updatedQuestionNewNumber,
            },
          },
          data: {
            number: {
              increment: 1,
            },
          },
        });
      }

      // await tx.$executeRaw`UPDATE public."Quiz" SET updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'GMT' WHERE id = ${surveyId}`;

      const movedQuestion = await tx.question.update({
        where: { id: question.id },
        data: {
          number: updatedQuestionNewNumber,
          surveyPage: {
            connect: { id: targetSurveyPage.id },
          },
        },
      });

      await tx.quiz.update({
        where: { id: surveyId },
        data: { updated_at: movedQuestion.updated_at },
      });

      return movedQuestion;
    } else {
      const targetSurveyPage = await tx.surveyPage.findUnique({
        where: { id: req.body.pageId },
        include: {
          _count: {
            select: { questions: true },
          },
        },
      });
      if (!targetSurveyPage || targetSurveyPage._count.questions > 0)
        throw new AppError(
          "",
          "Not found",
          HttpStatusCode.BAD_REQUEST,
          "",
          true
        );
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

      let movedQuestionNumber = questionBeforeNewQuestion!.number;

      if (questionBeforeNewQuestion!.number > question.number) {
        await tx.question.updateMany({
          where: {
            quiz: { id: surveyId },
            number: {
              gt: question.number,
              lte: movedQuestionNumber,
            },
          },
          data: {
            number: {
              decrement: 1,
            },
          },
        });
      } else {
        movedQuestionNumber = questionBeforeNewQuestion!.number + 1;
        await tx.question.updateMany({
          where: {
            quiz: { id: surveyId },
            number: {
              gte: movedQuestionNumber,
              lt: question.number,
            },
          },
          data: {
            number: {
              increment: 1,
            },
          },
        });
      }

      const updatedQuestion = await tx.question.update({
        where: { id: question.id },
        data: {
          number: movedQuestionNumber,
          surveyPage: {
            connect: { id: targetSurveyPage.id },
          },
        },
      });

      await tx.quiz.update({
        where: { id: surveyId },
        data: { updated_at: updatedQuestion.updated_at },
      });

      return updatedQuestion;
    }
  });

  return res.status(HttpStatusCode.OK).json(movedQuestion);
};

const copyQuestionHandler = async (
  req: Request<SurveyQuestionParams, any, PlaceQuestionReqBody>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const questionId = req.params.questionId;
  const userId = req.auth.userId;

  const [survey, question] = await Promise.all([
    getSurvey(surveyId),
    getQuestion(questionId),
  ]);

  if (!survey || !question)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId || question.quizId !== surveyId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  //transactione
  //prvo gde ubacujes pitanje pomeri sve ispred njega za 1.
  //sacuvaj pitanje sa numberom koji god da je.
  const createdQuestion = await prisma.$transaction(async (tx) => {
    if (req.body.questionId) {
      const targetQuestionPromise = tx.question.findUnique({
        where: { id: req.body.questionId },
      });
      const targetSurveyPagePromise = tx.surveyPage.findUnique({
        where: { id: req.body.pageId },
        include: {
          _count: {
            select: { questions: true },
          },
        },
      });
      const [targetQuestion, targetSurveyPage] = await Promise.all([
        targetQuestionPromise,
        targetSurveyPagePromise,
      ]);

      if (
        !targetSurveyPage ||
        !targetQuestion ||
        targetQuestion?.surveyPageId !== req.body.pageId
      ) {
        //pitanje premesteno vrati error. Kao nesto nije u redu mozda da refresh podatke sa invalidate query.
        //ili obrisano pitanje.
        //ili obrisana stranica.
        throw new AppError(
          "",
          "Not found",
          HttpStatusCode.BAD_REQUEST,
          "",
          true
        );
      }

      if (targetSurveyPage?._count.questions === 50) {
        //stranica puna ne moze vise
        throw new AppError(
          "",
          "Not found",
          HttpStatusCode.BAD_REQUEST,
          "",
          true
        );
      }
      const newQuestionNumber =
        req.body.position === OperationPosition.after
          ? targetQuestion.number + 1
          : targetQuestion.number;
      await tx.question.updateMany({
        where: {
          number: {
            gt:
              req.body.position === OperationPosition.before
                ? targetQuestion.number - 1
                : targetQuestion.number,
          },
          quiz: { id: surveyId },
        },
        data: {
          number: {
            increment: 1,
          },
        },
      });
      const newQuestion = await tx.question.create({
        data: {
          description: question.description,
          type: question.type,
          description_image: question.description_image,
          quiz: {
            connect: {
              id: surveyId,
            },
          },
          surveyPage: { connect: { id: targetSurveyPage.id } },
          number: newQuestionNumber,
          options:
            question.type !== QuestionType.textbox
              ? {
                  create: question.options.map((option) => ({
                    description: option.description,
                  })),
                }
              : undefined,
        },
      });

      await tx.quiz.update({
        where: { id: surveyId },
        data: { updated_at: newQuestion.created_at },
      });

      return newQuestion;
    } else {
      const targetSurveyPage = await tx.surveyPage.findUnique({
        where: { id: req.body.pageId },
        include: {
          _count: {
            select: { questions: true },
          },
        },
      });
      if (!targetSurveyPage || targetSurveyPage._count.questions !== 0) {
        //stranica puna ne moze vise
        throw new AppError(
          "",
          "Bad reqeust",
          HttpStatusCode.BAD_REQUEST,
          "",
          true
        );
      }
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

      const newQuestionNumber = questionBeforeNewQuestion
        ? questionBeforeNewQuestion.number + 1
        : 1;
      await tx.question.updateMany({
        where: {
          number: { gt: newQuestionNumber - 1 },
          quiz: { id: surveyId },
        },
        data: {
          number: {
            increment: 1,
          },
        },
      });

      const newQuestion = await tx.question.create({
        data: {
          description: question.description,
          type: question.type,
          description_image: question.description_image,
          quiz: {
            connect: {
              id: surveyId,
            },
          },
          surveyPage: { connect: { id: targetSurveyPage.id } },
          number: newQuestionNumber,
          options:
            question.type !== QuestionType.textbox
              ? {
                  create: question.options.map((option) => ({
                    description: option.description,
                  })),
                }
              : undefined,
        },
      });

      await tx.quiz.update({
        where: { id: surveyId },
        data: { updated_at: newQuestion.created_at },
      });

      return newQuestion;
    }
  });

  return res.status(HttpStatusCode.OK).json(createdQuestion);
};

const saveQuestionHandler = async (
  req: Request<{ quizId: string }, any, { data: Question; pageId: string }>,
  res: Response
) => {
  const quizId = req.params.quizId;
  const userId = req.auth.userId;

  const survey = await getSurvey(quizId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const savedQuestion = await saveQuestion(
    req.body.data,
    quizId,
    req.body.pageId
  );
  return res.status(201).json(savedQuestion);
};

const updateQuestionHandler = async (
  req: Request<SurveyParams, any, { data: Question; pageId: string }>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;

  const survey = await getSurvey(surveyId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const updatedQuestion = await updateQuestion(req.body.data, surveyId);

  return res.status(HttpStatusCode.OK).json(updatedQuestion);
};

const createQuestionHandler = async (
  req: Request<SurveyParams, any, { data: Question; pageId: string }>,
  res: Response,
  next: NextFunction
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;

  const survey = await getSurvey(surveyId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const createdQuestion = await createQuestion(
    req.body.data,
    surveyId,
    req.body.pageId
  );

  return res.status(HttpStatusCode.CREATED).json(createdQuestion);
};

const deleteSurveyQuestionHandler = async (
  req: Request<SurveyQuestionParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const questionId = req.params.questionId;
  const userId = req.auth.userId;

  const [survey, question] = await Promise.all([
    getSurvey(surveyId),
    getQuestion(questionId),
  ]);

  if (!survey || !question)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId || question.quizId !== surveyId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  //here we deleting if question has no responses
  console.log("pre brisanja bulje");
  await deleteQuestion(question);

  return res.sendStatus(HttpStatusCode.NO_CONTENT);
};

const createSurveyPageHandler = async (
  req: Request<SurveyParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;
  const survey = await getSurvey(surveyId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const createdPage = await createSurveyPage(surveyId);

  return res.status(HttpStatusCode.CREATED).json(createdPage);
};

const getSurveyResponseQuestionResponsesHandler = async (
  req: Request<CollectorParams, any, SurveyResponseQuestionResponsesBody>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const collectorId = req.params.collectorId;
  const questionsIds = req.body.questionsIds;

  if (req.cookies && req.cookies.surveResponses) {
    const surveyResponses: {
      id: string;
      surveyId: string;
      collectorId: string;
      submitted: boolean;
    }[] = JSON.parse(req.cookies.surveyResponses);

    const responseExists = surveyResponses.find(
      (response) =>
        response.surveyId === surveyId && collectorId === response.collectorId
    );

    if (responseExists) {
      const questionResponses = await getSurveyResponseQuestionResponses(
        responseExists.id,
        questionsIds
      );

      return res.status(HttpStatusCode.OK).json(questionResponses);
    }

    return res.status(HttpStatusCode.OK).json([]);
  }

  return res.status(HttpStatusCode.OK).json([]);
};

const saveSurveyResponseHandler = async (
  req: Request<
    SurveyParams,
    any,
    SaveSurveyResponseRequestBody,
    { type: string }
  >,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const collectorId = req.body.collectorId;
  const submit = req.body.submit ? true : false;

  const responderIPAddress = req.ip;
  const blockedCollectorIds: string[] =
    (req.cookies &&
      req.cookies.blocked_col &&
      JSON.parse(req.cookies.blocked_col)) ??
    [];
  const surveyResponses: {
    id: string;
    surveyId: string;
    collectorId: string;
    submitted: boolean;
  }[] =
    (req.signedCookies &&
      req.signedCookies.surveyResponses &&
      JSON.parse(req.signedCookies.surveyResponses)) ??
    [];

  if (blockedCollectorIds.includes(collectorId)) {
    throw new AppError(
      "",
      "Already done!",
      HttpStatusCode.BAD_REQUEST,
      "",
      true
    );
  }

  //check if questions got updated
  const changeExists = await prisma.quiz.findUnique({
    where: {
      id: surveyId,
      updated_at: {
        gte: new Date(req.body.surveyResposneStartTime).toISOString(),
      },
    },
  });

  if (changeExists)
    throw new AppError(
      "",
      "Resource changed!",
      HttpStatusCode.CONFLICT,
      "",
      true
    );

  if (collectorId === "preview")
    return res.status(HttpStatusCode.ACCEPTED).json({ submitted: submit });

  const collector = await getSurveyCollector(collectorId);
  if (!collector || collector.surveyId !== surveyId)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  const responseExists = surveyResponses.find(
    (surveyRes) =>
      surveyRes.collectorId === collectorId && surveyRes.surveyId === surveyId
  );

  if (responseExists) {
    //different
    const surveyResponse = await saveSurveyResponse(
      req.body,
      collectorId,
      surveyId,
      submit,
      responderIPAddress,
      responseExists.id
    );

    if (submit) {
      blockedCollectorIds.push(surveyResponse.collectorId);
      res.cookie("blocked_col", JSON.stringify(blockedCollectorIds), {
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 * 24,
      });

      const filteredResponses = surveyResponses.filter(
        (sRes) => sRes.id !== surveyResponse.id
      );
      res.cookie("surveyResponses", JSON.stringify(filteredResponses), {
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        signed: true,
      });
      return res.status(HttpStatusCode.ACCEPTED).json({ submitted: true });
    }

    return res.status(HttpStatusCode.ACCEPTED).json({ submitted: false });
  } else {
    const surveyResponse = await saveSurveyResponse(
      req.body,
      collectorId,
      surveyId,
      submit,
      responderIPAddress
    );
    const newSurveyResponse = {
      id: surveyResponse.id,
      surveyId,
      collectorId,
      submitted: submit,
    };

    if (submit) {
      blockedCollectorIds.push(surveyResponse.collectorId);
      res.cookie("blocked_col", JSON.stringify(blockedCollectorIds), {
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 * 24,
      });
    }

    res.cookie(
      "surveyResponses",
      JSON.stringify([...surveyResponses, newSurveyResponse]),
      {
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        signed: true,
      }
    );

    return res.status(HttpStatusCode.ACCEPTED).json({ submitted: submit });
  }
};

const getSurveyResponseAnswersHandler = async (
  req: Request<
    SurveyParams & { responseId: string },
    any,
    never,
    { page?: string }
  >,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const responseId = req.params.responseId;
  const page = Number(req.query.page);
  const pageNum = isNaN(page) ? 1 : page;

  const survey = await getSurvey(surveyId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  const questions = await getQuestions(surveyId, pageNum);

  const questionResponses = await getSurveyResponseQuestionResponses(
    responseId,
    questions.map((q) => q.id)
  );

  return res.status(HttpStatusCode.OK).json({
    questions,
    questionResponses,
  });
};

const getSurveyQuestionsAndResponsesHandler = async (
  req: Request<
    CollectorParams,
    any,
    never,
    { page?: string; collectorId?: string }
  >,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const collectorId = req.query.collectorId;
  const survey = await getSurvey(surveyId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  const questions = await getQuestions(surveyId, Number(req.query.page));

  if (req.signedCookies && req.signedCookies.surveyResponses) {
    const surveyResponses: {
      id: string;
      surveyId: string;
      collectorId: string;
      submitted: boolean;
    }[] = JSON.parse(req.signedCookies.surveyResponses);

    const responseExists = surveyResponses.find(
      (response) =>
        response.surveyId === surveyId && collectorId === response.collectorId
    );

    if (responseExists) {
      const questionResponses = await getSurveyResponseQuestionResponses(
        responseExists.id,
        questions.map((q) => q.id)
      );

      return res.status(HttpStatusCode.OK).json({
        questions,
        questionResponses,
      });
    }

    return res.status(HttpStatusCode.OK).json({
      questions,
      questionResponses: [],
    });
  }

  return res.status(HttpStatusCode.OK).json({
    questions,
    questionResponses: [],
  });
};

const getQuestionsResultHandler = async (
  req: Request<SurveyParams, never, GetQuestionResultsRequestBody>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;

  const survey = await getSurvey(surveyId);
  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const questionsResults = await getQuestionsResult(
    surveyId,
    req.body.questionIds
  );

  return res.status(HttpStatusCode.OK).json(questionsResults);
};

const getSurveyResponseHandler = async (
  req: Request<SurveyParams & { responseId: string }>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const responseId = req.params.responseId;
  const userId = req.auth.userId;

  const survey = await getSurvey(surveyId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const surveyResponse = await getSurveyResponse(surveyId, responseId);

  if (!surveyResponse)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  return res.status(HttpStatusCode.OK).json(surveyResponse);
};

const getSurveyResponsesHandler = async (
  req: Request<SurveyParams, any, never, { page?: string; sort?: string }>,
  res: Response
) => {
  console.log("dqq");
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;
  const survey = await getSurvey(surveyId);
  const page = Number(req.query.page);
  const pageNum = isNaN(page) ? 1 : page;

  const sort: { name: string; type: "asc" | "desc" } = req.query.sort
    ? {
        name: req.query.sort.split(":")[0],
        type: req.query.sort.split(":")[1] as "asc" | "desc",
      }
    : { name: "updated_at", type: "desc" };

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const [surveyResponses, responsesCount] = await Promise.all([
    getSurveyResponses(surveyId, pageNum, sort),
    getSurveyResponseCount(surveyId),
  ]);
  const nextPage = responsesCount > pageNum * 30 ? pageNum + 1 : undefined;

  return res.status(HttpStatusCode.OK).json({
    current_page: pageNum,
    data: surveyResponses,
    next_page: nextPage,
    total_pages: Math.ceil(responsesCount / 30),
    responses_count: responsesCount,
  });
};

const getSurveyQuestionsHandler = async (
  req: Request<SurveyParams, any, never, { page?: string }>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;
  const survey = await getSurvey(surveyId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const questions = await getQuestions(surveyId, Number(req.query.page));
  // res.on("finish", () => {
  //   const setCookieHeader = res.get("Set-Cookie");
  //   console.log(res.getHeaders());
  //   console.log("Set-Cookie Header:", setCookieHeader);
  // });

  return res.status(HttpStatusCode.OK).json({ questions });
};

const deleteSurveyPageHandler = async (
  req: Request<SurveyPageParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const pageId = req.params.pageId;
  const userId = req.auth.userId;
  const survey = await getSurvey(surveyId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  await deleteSurveyPage(surveyId, pageId);
  return res.sendStatus(HttpStatusCode.NO_CONTENT);
};

const copySurveyPageHandler = async (
  req: Request<SurveyPageParams, any, PlacePageReqBody>,
  res: Response
) => {
  console.log("nikad ovde");
  const surveyId = req.params.surveyId;
  const sourcePageId = req.params.pageId;
  const userId = req.auth.userId;
  const survey = await getSurvey(surveyId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const createdPage = await copySurveyPage(
    surveyId,
    sourcePageId,
    req.body.position,
    req.body.pageId
  );

  return res.status(HttpStatusCode.CREATED).json(createdPage);
};

const getSurveyCollectorsHandler = async (
  req: Request<SurveyPageParams>,
  res: Response
) => {
  const surveyId = req.params.surveyId;
  const userId = req.auth.userId;
  const survey = await getSurvey(surveyId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const collectors = await getSurveyCollectors(surveyId);

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

  return res.status(HttpStatusCode.OK).json(formatedCollectors);
};

const moveSurveyPageHandler = async (
  req: Request<SurveyPageParams, any, PlacePageReqBody>,
  res: Response
) => {
  console.log("kurac");
  const surveyId = req.params.surveyId;
  const sourcePageId = req.params.pageId;
  const userId = req.auth.userId;
  const survey = await getSurvey(surveyId);

  if (!survey)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  if (survey.creatorId !== userId)
    throw new AppError(
      "",
      "Unauthorized",
      HttpStatusCode.UNAUTHORIZED,
      "",
      true
    );

  const movedPage = await moveSurveyPage(
    surveyId,
    sourcePageId,
    req.body.position,
    req.body.pageId
  );

  return res.status(HttpStatusCode.OK).json(movedPage);
};

export default {
  createQuizHandler,
  getSurveyQuestionsHandler,
  saveQuestionHandler,
  getSurveyHandler,
  saveSurveyResponseHandler,
  getQuestionsResultHandler,
  getSurveyPagesHandler,
  deleteSurveyQuestionHandler,
  createSurveyPageHandler,
  copyQuestionHandler,
  moveQuestionHandler,
  createQuestionHandler,
  updateQuestionHandler,
  deleteSurveyPageHandler,
  copySurveyPageHandler,
  moveSurveyPageHandler,
  getSurveyResponseQuestionResponsesHandler,
  getSurveyQuestionsAndResponsesHandler,
  getSurveyCollectorsHandler,
  getSurveyResponsesHandler,
  getSurveyResponseHandler,
  getSurveyResponseAnswersHandler,
  getSurveyResponsesVolumeHandler,
};
