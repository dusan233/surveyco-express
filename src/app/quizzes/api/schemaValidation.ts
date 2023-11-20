import { z } from "zod";
import { CollectorType, QuestionType } from "../../../types/types";

export const createQuizSchema = z.object({
  title: z.string().min(1, "You must enter quiz title."),
  category: z.string().min(1, "You must enter quiz title."),
});

export const createSurveyCollectorSchema = z.object({
  type: z.nativeEnum(CollectorType),
});

export const saveSurveyResponseSchema = z.object({
  responses: z.array(
    z.object({
      id: z.string(),
      answer: z.string().or(z.array(z.string())),
      type: z.nativeEnum(QuestionType),
    })
  ),
});

export const questionSchema = z.object({
  type: z.nativeEnum(QuestionType),
  description: z.string().min(1, "You must enter question description."),
  id: z.string().optional(),
});

export const multiChoiceQuestionSchema = questionSchema.extend({
  options: z
    .array(
      z.object({
        id: z.string().optional(),
        description: z.string().min(1, "You must enter option text."),
      })
    )
    .nonempty("You must add at least one option."),
});
