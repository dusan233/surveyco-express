import prisma from "../../../prismaClient";
import { CreateSurveyDTO, OrderByObject } from "../../../types/types";

export type SurveyRecord = {
  id: string;
  title: string;
  category: string | null;
  created_at: Date;
  updated_at: Date | null;
  creatorId: string;
};

export const createSurvey = async (
  newSurvey: CreateSurveyDTO
): Promise<SurveyRecord> => {
  return await prisma.quiz.create({
    data: {
      title: newSurvey.title,
      category: newSurvey.category,
      creator: {
        connect: { id: newSurvey.userId },
      },
      surveyPages: {
        create: {
          number: 1,
        },
      },
    },
  });
};

export const getSurveyById = async (surveyId: string) => {
  return await prisma.quiz.findUnique({
    where: { id: surveyId },
  });
};
export const getSurveyPageCount = async (surveyId: string) => {
  return await prisma.surveyPage.count({
    where: { surveyId },
  });
};
export const getSurveyResponseCount = async (surveyId: string) => {
  return await prisma.surveyResponse.count({ where: { surveyId } });
};
export const getSurveyQuestionCount = async (surveyId: string) => {
  return await prisma.question.count({ where: { quizId: surveyId } });
};
export const getSurveyCollectorStatuses = async (surveyId: string) => {
  return (
    await prisma.surveyCollector.findMany({
      where: { deleted: false, surveyId },
      distinct: ["status"],
      select: { status: true },
    })
  ).map((collector) => collector.status);
};

export const getSurveyIfUpdated = async (surveyId: string, date: Date) => {
  return await prisma.quiz.findUnique({
    where: {
      id: surveyId,
      updated_at: {
        gte: new Date(date).toISOString(),
      },
    },
  });
};

export const getUserSurveys = async (
  take: number,
  skip: number,
  userId: string,
  sort: OrderByObject
) => {
  const orderByObject = ["responses_count", "question_count"].includes(
    sort.column
  )
    ? {
        [sort.column === "responses_count" ? "surveyResponses" : "questions"]: {
          _count: sort.type,
        },
      }
    : { [sort.column]: sort.type };

  return await prisma.quiz.findMany({
    where: { creatorId: userId },
    orderBy: [orderByObject, { title: "asc" }],
    take,
    skip,
    include: {
      _count: {
        select: {
          surveyResponses: true,
          questions: true,
          surveyPages: true,
        },
      },
    },
  });
};

export const getUserSurveyCount = async (userId: string) => {
  return await prisma.quiz.count({ where: { creatorId: userId } });
};
