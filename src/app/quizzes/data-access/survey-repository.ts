import prisma from "../../../prismaClient";
import { CreateSurveyDTO } from "../../../types/types";

export type SurveyRecord = {
  id: string;
  title: string;
  category: string | null;
  created_at: Date;
  updated_at: Date | null;
  creatorId: string;
};

export const createSurvey = async (
  newSurvey: CreateSurveyDTO
): Promise<SurveyRecord> => {
  return await prisma.quiz.create({
    data: {
      title: newSurvey.title,
      category: newSurvey.category,
      creator: {
        connect: { id: newSurvey.userId },
      },
      surveyPages: {
        create: {
          number: 1,
        },
      },
    },
  });
};
