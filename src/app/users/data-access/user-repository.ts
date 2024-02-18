import prisma from "../../../prismaClient";
import { OrderByObject } from "../../../types/types";

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
