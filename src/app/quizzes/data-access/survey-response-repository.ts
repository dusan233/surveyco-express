import prisma from "../../../prismaClient";

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
