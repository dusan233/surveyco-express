import prisma from "../../../prismaClient";
import { CreateCollectorData } from "../../../types/types";
import * as surveyService from "../../quizzes/domain/services";
import * as collectorRepository from "../data-access/collectors.repository";
import {
  assertSurveyExists,
  assertUserCreatedSurvey,
} from "../../quizzes/domain/validators";
import { validateCreateCollector } from "./validators";

export const createSurveyCollector = async (
  collectorData: CreateCollectorData,
  userId: string
) => {
  const validatedCollectorData = validateCreateCollector(collectorData);

  const survey = await surveyService.getSurveyById(
    validatedCollectorData.surveyId
  );

  assertSurveyExists(survey);
  assertUserCreatedSurvey(survey!, userId);

  const newCollector = await collectorRepository.createCollector(
    validatedCollectorData
  );

  return newCollector;
};

export const deleteSurveyCollector = async (collectorId: string) => {
  return prisma.$transaction(async (tx) => {
    // this when u add deleted props to others
    // await tx.surveyResponse.updateMany({where: {collectorId}, data: {
    //   deleted: true
    // }})

    return await tx.surveyCollector.update({
      where: { id: collectorId },
      data: {
        deleted: true,
        status: "close",
      },
    });
  });
};

export const updateSurveyCollector = async (
  name: string,
  collectorId: string
) => {
  return await prisma.surveyCollector.update({
    where: { id: collectorId },
    data: {
      name,
    },
  });
};

export const updateSurveyCollectorStatus = async (
  collectodId: string,
  status: "open" | "closed"
) => {
  return await prisma.surveyCollector.update({
    where: { id: collectodId },
    data: {
      status: status,
    },
  });
};

export const getSurveyCollector = async (collectorId: string) => {
  const collector = await prisma.surveyCollector.findUnique({
    where: { id: collectorId },
  });

  return collector;
};
