import prisma from "../../../prismaClient";

export const getQuestionsByPageId = async (
  surveyId: string,
  pageId: string
) => {
  const questions = await prisma.question.findMany({
    where: {
      quizId: surveyId,
      surveyPage: { id: pageId },
    },
    orderBy: { number: "asc" },
    include: {
      options: true,
    },
  });

  return questions;
};
