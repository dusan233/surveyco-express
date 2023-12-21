import { z } from "zod";
import {
  CollectorType,
  OperationPosition,
  QuestionType,
} from "../../../types/types";

export const createQuizSchema = z.object({
  title: z.string().min(1, "You must enter quiz title."),
  category: z.string().min(1, "You must enter quiz title."),
});

export const createSurveyCollectorSchema = z.object({
  type: z.nativeEnum(CollectorType),
});

export const saveSurveyResponseSchema = z.object({
  questionResponses: z.array(
    z.object({
      id: z.string().optional(),
      questionId: z.string(),
      answer: z.string().or(z.array(z.string())),
      questionType: z.nativeEnum(QuestionType),
    })
  ),
  collectorId: z.string(),
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

export const placeQuestionSchema = z
  .object({
    pageId: z.string(),
    position: z.nativeEnum(OperationPosition).optional(),
    questionId: z.string().optional(),
  })
  .refine(
    (input) => {
      if (
        (input.position && input.questionId) ||
        (!input.position && !input.questionId)
      )
        return true;
      return false;
    },
    {
      message: "Both position and questionId should be included or omitted.",
      path: ["position", "_", "questionId"],
    }
  );

export const placePageSchema = z.object({
  position: z.nativeEnum(OperationPosition),
  pageId: z.string(),
});

export const saveQuestionSchema = z.object({
  data: questionSchema,
  pageId: z.string(),
});

export const updateQuestionSchema = z.object({
  data: z.object({
    type: z.nativeEnum(QuestionType),
    description: z.string().min(1, "You must enter question description."),
    id: z.string(),
  }),
});

export const createQuestionSchema = z.object({
  data: z.object({
    type: z.nativeEnum(QuestionType),
    description: z.string().min(1, "You must enter question description."),
  }),
  pageId: z.string(),
});

export const saveMultiChoiceQuestionSchema = z.object({
  data: multiChoiceQuestionSchema,
  pageId: z.string().optional(),
});
