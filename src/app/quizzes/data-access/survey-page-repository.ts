import prisma from "../../../prismaClient";

export const getSurveyPages = async (surveyId: string) => {
  const pages = await prisma.surveyPage.findMany({
    where: { survey: { id: surveyId } },
    orderBy: { number: "asc" },
  });

  return pages;
};
