import { z } from "zod";
import { CollectorStatus, CollectorType } from "../../../types/types";

export const createSurveyCollectorSchema = z.object({
  type: z.nativeEnum(CollectorType),
  surveyId: z.string(),
});

export const updateSurveyCollectorStatusSchema = z.object({
  status: z.nativeEnum(CollectorStatus),
});

export const updateSurveyCollectorSchema = z.object({
  name: z.string().trim().min(1, "You must enter collector name."),
});
