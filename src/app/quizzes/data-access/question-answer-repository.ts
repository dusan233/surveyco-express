import prisma from "@/prismaClient";

export const getChoiceCountPerQuestion = async (questionIds: string[]) => {
  return await prisma.questionAnswer.groupBy({
    by: ["questionOptionId"],
    where: {
      questionId: {
        in: questionIds,
      },
    },
    _count: true,
  });
};

export const getQuestionAnswers = async (questionId: string) => {
  return prisma.questionAnswer.findMany({
    where: { questionId },
    orderBy: {
      created_at: "asc",
    },
    take: 20,
  });
};
