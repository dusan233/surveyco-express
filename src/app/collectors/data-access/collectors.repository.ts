import { Prisma } from "@prisma/client";
import prisma from "@/prismaClient";
import {
  CollectorStatus,
  CollectorType,
  CollectrorRecord,
  CreateCollectorData,
  OrderByObject,
  UpdateCollectorDTO,
} from "@/types/types";

export const getCollectorCountBySurveyId = async (surveyId: string) => {
  return await prisma.surveyCollector.count({ where: { surveyId } });
};

export const updateCollector = async (
  collectorData: UpdateCollectorDTO
): Promise<CollectrorRecord> => {
  const { collectorId, ...restData } = collectorData;
  return await prisma.surveyCollector.update({
    where: { id: collectorData.collectorId },
    data: restData,
  });
};

export const deleteCollector = async (collectorId: string) => {
  return await prisma.surveyCollector.delete({
    where: { id: collectorId },
  });
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

export const getCollectorById = async (
  collectorId: string
): Promise<CollectrorRecord | null> => {
  const collector = await prisma.surveyCollector.findUnique({
    where: { id: collectorId },
  });

  return collector;
};

export const createCollector = async (
  data: CreateCollectorData
): Promise<CollectrorRecord> => {
  const collector = await prisma.$transaction(
    async (tx) => {
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
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

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
