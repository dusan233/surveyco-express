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
