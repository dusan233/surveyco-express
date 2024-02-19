import { z } from "zod";
import {
  CollectorType,
  OperationPosition,
  QuestionType,
  SurveyCategory,
} from "../../../types/types";

export const createQuizSchema = z.object({
  title: z.string().trim().min(1, "You must enter survey title."),
  category: z.nativeEnum(SurveyCategory).optional(),
});

export const createSurveyCollectorSchema = z.object({
  type: z.nativeEnum(CollectorType),
});

export const getQuestionResultsSchema = z.object({
  questionIds: z.array(z.string()),
});

export const saveSurveyResponseSchema = z.object({
  questionResponses: z.array(
    z
      .object({
        id: z.string().optional(),
        questionId: z.string(),
        required: z.boolean(),
        answer: z.string().or(z.array(z.string())),
        questionType: z.nativeEnum(QuestionType),
      })
      .refine((question) => {
        if (question.questionType && question.required) {
          if (question.answer === "") return false;
        } else {
          if (question.required && question.answer.length === 0) return false;
        }
        return true;
      }, "Answer for this question is required")
  ),
  collectorId: z.string(),
  submit: z.boolean().optional(),
  surveyResposneStartTime: z.coerce.date(),
});

export const surveyResponseQuestionResponseSchema = z.object({
  questionsIds: z.array(z.string()),
});

export const questionSchema = z.object({
  type: z.nativeEnum(QuestionType),
  description: z.string().trim().min(1, "You must enter question description."),
  descriptionImage: z.string().or(z.null()),
  required: z.boolean(),
  id: z.string().optional(),
});

export const multiChoiceQuestionSchema = questionSchema.extend({
  options: z
    .array(
      z.object({
        id: z.string().optional(),
        description: z.string().trim().min(1, "You must enter option text."),
        descriptionImage: z.string().or(z.null()),
      })
    )
    .nonempty("You must add at least one option."),
  randomize: z.boolean(),
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
    description: z
      .string()
      .trim()
      .min(1, "You must enter question description."),
    descriptionImage: z.string().or(z.null()),
    required: z.boolean(),
    randomize: z.boolean().optional(),
    id: z.string(),
  }),
});

export const createQuestionSchema = z.object({
  data: z.object({
    type: z.nativeEnum(QuestionType),
    description: z
      .string()
      .trim()
      .min(1, "You must enter question description."),
    descriptionImage: z.string().or(z.null()),
    required: z.boolean(),
    randomize: z.boolean().optional(),
  }),
  pageId: z.string(),
});

export const saveMultiChoiceQuestionSchema = z.object({
  data: multiChoiceQuestionSchema,
  pageId: z.string().optional(),
});

export const surveyCollectorsQueryParamsSchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((value) => (value ? parseInt(value) : 1)),
  take: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((value) => (value ? parseInt(value) : 10)),
  sort: z
    .string()
    .regex(/^(name|updated_at|status|total_responses):(asc|desc)$/)
    .optional()
    .transform((value) => {
      const [columnName, type] = value ? value.split(":") : ["name", "asc"];
      return { column: columnName, type: type as "asc" | "desc" };
    }),
});
