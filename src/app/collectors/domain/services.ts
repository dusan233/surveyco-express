import prisma from "../../../prismaClient";
import { CollectorType } from "../../../types/types";

export const createSurveyCollector = async (
  collectorType: CollectorType,
  surveyId: string
) => {
  const collector = await prisma.surveyCollector.create({
    data: {
      type: collectorType,
      status: "open",
      survey: { connect: { id: surveyId } },
    },
  });

  return collector;
};

export const getSurveyCollector = async (collectorId: string) => {
  const collector = await prisma.surveyCollector.findUnique({
    where: { id: collectorId },
  });

  return collector;
};
