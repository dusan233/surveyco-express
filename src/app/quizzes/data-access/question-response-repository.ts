import prisma from "../../../prismaClient";

export const getQuestionResponseCountPerQuestion = async (
  questionIds: string[]
) => {
  return await prisma.questionResponse.groupBy({
    by: ["questionId"],
    where: {
      questionId: {
        in: questionIds,
      },
    },
    _count: true,
  });
};

export const getQuestionResponsesBySurveyResponseId = async (
  responseId: string,
  questionIds: string[]
) => {
  return await prisma.questionResponse.findMany({
    include: {
      answer: true,
    },
    where: {
      surveyResponseId: responseId,
      questionId: {
        in: questionIds,
      },
    },
  });
};
