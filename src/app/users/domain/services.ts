import prisma from "../../../prismaClient";

export const getUserSurveys = async (
  userId: string,
  page: number,
  sort: { column: string; type: "asc" | "desc" }
) => {
  const take = 30;
  const skip = (page - 1) * take;
  const orderBy = ["responses_count", "question_count"].includes(sort.column)
    ? {
        [sort.column === "responses_count" ? "surveyResponses" : "questions"]: {
          _count: sort.type,
        },
      }
    : { [sort.column]: sort.type };

  return await prisma.quiz.findMany({
    where: { creatorId: userId },
    orderBy: [orderBy, { title: "asc" }],
    take,
    skip,
    include: {
      _count: {
        select: {
          surveyResponses: true,
          questions: true,
          surveyPages: true,
        },
      },
    },
  });
};

export const getUserSurveyCount = async (userId: string) => {
  return await prisma.quiz.count({ where: { creatorId: userId } });
};
