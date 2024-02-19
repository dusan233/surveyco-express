import prisma from "../../../prismaClient";
import {
  CollectorStatus,
  CollectorType,
  CollectrorRecord,
  CreateCollectorData,
  OrderByObject,
} from "../../../types/types";

export const getCollectorCountBySurveyId = async (surveyId: string) => {
  return await prisma.surveyCollector.count({ where: { surveyId } });
};

export const createCollector = async (
  data: CreateCollectorData
): Promise<CollectrorRecord> => {
  const collector = await prisma.$transaction(async (tx) => {
    const collectorName =
      data.type === CollectorType.web_link
        ? "Web Link " +
          ((await tx.surveyCollector.count({
            where: {
              surveyId: data.surveyId,
              type: CollectorType.web_link,
            },
          })) +
            1)
        : "New Collector";

    return await tx.surveyCollector.create({
      data: {
        name: collectorName,
        type: data.type,
        status: CollectorStatus.open,
        survey: { connect: { id: data.surveyId } },
      },
    });
  });

  return collector;
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
