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
          (await tx.surveyCollector.count({
            where: { surveyId, type: CollectorType.web_link },
          })) +
          1
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

export const getSurveyCollector = async (collectorId: string) => {
  const collector = await prisma.surveyCollector.findUnique({
    where: { id: collectorId },
  });

  return collector;
};
