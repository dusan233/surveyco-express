import prisma from "../../../prismaClient";
import { OrderByObject } from "../../../types/types";

export const getSurveyResponsesBySurveyId = async (
  surveyId: string,
  params: {
    take: number;
    skip: number;
    sort: OrderByObject;
  }
) => {
  const orderBy =
    params.sort.column === "collector"
      ? { collector: { name: params.sort.type } }
      : { [params.sort.column]: params.sort.type };
  return await prisma.surveyResponse.findMany({
    where: { surveyId },
    orderBy: [orderBy, { display_number: "asc" }],
    take: params.take,
    skip: params.skip,
    include: {
      collector: true,
    },
  });
};

export const getSurveyResponseCount = async (surveyId: string) => {
  return await prisma.surveyResponse.count({
    where: { surveyId },
  });
};

export const getSurveyResponseCountRangeDate = async (
  surveyId: string,
  gte: string,
  lte: string
) => {
  return await prisma.surveyResponse.groupBy({
    by: ["created_at"],
    _count: {
      _all: true,
    },
    where: {
      surveyId,
      created_at: {
        gte,
        lte,
      },
    },
  });
};
