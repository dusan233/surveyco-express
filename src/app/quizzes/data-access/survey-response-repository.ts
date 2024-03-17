import prisma from "../../../prismaClient";
import {
  OrderByObject,
  QuestionType,
  SaveSurveyResponseDTO,
} from "../../../types/types";

export const getSurveyResponse = async (
  responseId: string,
  surveyId: string
) => {
  return await prisma.surveyResponse.findUnique({
    where: { id: responseId, surveyId },
    include: {
      collector: true,
    },
  });
};

export const getSurveyResponsesBySurveyId = async (
  surveyId: string,
  params: {
    take: number;
    skip: number;
    sort: OrderByObject;
  }
) => {
  const orderBy =
    params.sort.column === "collector"
      ? { collector: { name: params.sort.type } }
      : { [params.sort.column]: params.sort.type };
  return await prisma.surveyResponse.findMany({
    where: { surveyId },
    orderBy: [orderBy, { display_number: "asc" }],
    take: params.take,
    skip: params.skip,
    include: {
      collector: true,
    },
  });
};

export const saveSurveyResponse = async (params: SaveSurveyResponseDTO) => {
  const filledQuestionsResponses = params.data.questionResponses.filter(
    (response) => response.answer.length !== 0
  );

  const newQuestionsResponses = params.data.questionResponses.filter(
    (response) => response.answer.length !== 0 && !response.id
  );
  const surveyResponse = await prisma.surveyResponse.upsert({
    where: { id: params.surveyResponseId || "" },
    create: {
      collector: {
        connect: {
          id: params.collectorId,
        },
      },
      survey: {
        connect: {
          id: params.surveyId,
        },
      },
      ip_address: params.responderIPAddress,
      status: params.complete ? "complete" : "incomplete",
      display_number:
        (await prisma.surveyResponse.count({
          where: { surveyId: params.surveyId },
        })) + 1,
      questionResponses: {
        create: newQuestionsResponses.map((questionResponse) => ({
          question: {
            connect: { id: questionResponse.questionId },
          },
          answer: {
            create:
              questionResponse.questionType === QuestionType.textbox
                ? [
                    {
                      question: {
                        connect: { id: questionResponse.questionId },
                      },
                      textAnswer: questionResponse.answer as string,
                    },
                  ]
                : typeof questionResponse.answer === "string"
                ? [
                    {
                      question: {
                        connect: { id: questionResponse.questionId },
                      },
                      questionOption: {
                        connect: { id: questionResponse.answer },
                      },
                    },
                  ]
                : questionResponse.answer.map((answer) => ({
                    question: {
                      connect: { id: questionResponse.questionId },
                    },
                    questionOption: {
                      connect: { id: answer },
                    },
                  })),
          },
        })),
      },
    },
    update: {
      status: params.complete ? "complete" : "incomplete",
      questionResponses: {
        upsert: filledQuestionsResponses.map((questionResponse) => ({
          where: { id: questionResponse.id || "" },
          create: {
            question: {
              connect: { id: questionResponse.questionId },
            },
            answer: {
              create:
                questionResponse.questionType === QuestionType.textbox
                  ? [
                      {
                        question: {
                          connect: { id: questionResponse.questionId },
                        },
                        textAnswer: questionResponse.answer as string,
                      },
                    ]
                  : typeof questionResponse.answer === "string"
                  ? [
                      {
                        question: {
                          connect: { id: questionResponse.questionId },
                        },
                        questionOption: {
                          connect: { id: questionResponse.answer },
                        },
                      },
                    ]
                  : questionResponse.answer.map((answer) => ({
                      question: {
                        connect: { id: questionResponse.questionId },
                      },
                      questionOption: {
                        connect: { id: answer },
                      },
                    })),
            },
          },
          update: {
            answer: {
              deleteMany: {},
              create:
                questionResponse.questionType === QuestionType.textbox
                  ? [
                      {
                        question: {
                          connect: { id: questionResponse.questionId },
                        },
                        textAnswer: questionResponse.answer as string,
                      },
                    ]
                  : typeof questionResponse.answer === "string"
                  ? [
                      {
                        question: {
                          connect: { id: questionResponse.questionId },
                        },
                        questionOption: {
                          connect: { id: questionResponse.answer },
                        },
                      },
                    ]
                  : questionResponse.answer.map((answer) => ({
                      question: {
                        connect: { id: questionResponse.questionId },
                      },
                      questionOption: {
                        connect: { id: answer },
                      },
                    })),
            },
          },
        })),
      },
    },
  });

  return surveyResponse;
};

export const getSurveyResponseCount = async (surveyId: string) => {
  return await prisma.surveyResponse.count({
    where: { surveyId },
  });
};

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
