import prisma from "../../../prismaClient";
import { CollectorType } from "../../../types/types";

export const createSurveyCollector = async (
  collectorType: CollectorType,
  surveyId: string
) => {
  const collector = await prisma.$transaction(async (tx) => {
    const collectorName =
      collectorType === CollectorType.web_link
        ? "Web Link " +
          ((await tx.surveyCollector.count({
            where: { surveyId, type: CollectorType.web_link },
          })) +
            1)
        : "New Collector";

    return await prisma.surveyCollector.create({
      data: {
        name: collectorName,
        type: collectorType,
        status: "open",
        survey: { connect: { id: surveyId } },
      },
    });
  });

  return collector;
};

export const deleteSurveyCollector = async (collectorId: string) => {
  return prisma.$transaction(async (tx) => {
    // this when u add deleted props to others
    // await tx.surveyResponse.updateMany({where: {collectorId}, data: {
    //   deleted: true
    // }})

    return await tx.surveyCollector.update({
      where: { id: collectorId },
      data: {
        deleted: true,
        status: "close",
      },
    });
  });
};

export const updateSurveyCollector = async (
  name: string,
  collectorId: string
) => {
  return await prisma.surveyCollector.update({
    where: { id: collectorId },
    data: {
      name,
    },
  });
};

export const updateSurveyCollectorStatus = async (
  collectodId: string,
  status: "open" | "closed"
) => {
  return await prisma.surveyCollector.update({
    where: { id: collectodId },
    data: {
      status: status,
    },
  });
};

export const getSurveyCollector = async (collectorId: string) => {
  const collector = await prisma.surveyCollector.findUnique({
    where: { id: collectorId },
  });

  return collector;
};
