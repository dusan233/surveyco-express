import { z } from "zod";
import { CollectorType } from "../../../types/types";

export const createSurveyCollectorSchema = z.object({
  type: z.nativeEnum(CollectorType),
  surveyId: z.string(),
});
