import prisma from "../../../prismaClient";
import { OrderByObject } from "../../../types/types";

export const getCollectorCountBySurveyId = async (surveyId: string) => {
  return await prisma.surveyCollector.count({ where: { surveyId } });
};

export const getCollectorsBySurveyId = async (
  surveyId: string,
  params: {
    take: number;
    skip: number;
    sort: OrderByObject;
  }
) => {
  const orderBy =
    params.sort.column === "total_responses"
      ? { responses: { _count: params.sort.type } }
      : { [params.sort.column]: params.sort.type };

  return await prisma.surveyCollector.findMany({
    where: { surveyId, deleted: { not: true } },
    skip: params.skip,
    take: params.take,
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
