import { z } from "zod";
import {
  OperationPosition,
  QuestionType,
  SurveyCategory,
} from "../../../types/types";

export const placePageSchema = z.object({
  position: z.nativeEnum(OperationPosition),
  pageId: z.string(),
});

export const createSurveySchema = z.object({
  title: z.string().trim().min(1, "You must enter survey title."),
  category: z.nativeEnum(SurveyCategory).optional(),
});

export const savedQuestionResponsesQueryParamsSchema = z.object({
  pageId: z.string(),
  collectorId: z.string(),
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

export const surveyResponsesQueryParamsSchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((value) => (value ? parseInt(value) : 1)),
  sort: z
    .string()
    .regex(/^(status|updated_at|ip_address|collector):(asc|desc)$/)
    .optional()
    .transform((value) => {
      const [columnName, type] = value
        ? value.split(":")
        : ["updated_at", "desc"];
      return { column: columnName, type: type as "asc" | "desc" };
    }),
});

export const saveSurveyResponseSchema = z
  .object({
    questionResponses: z.array(
      z
        .object({
          id: z.string().optional(),
          questionId: z.string(),
          answer: z.string().or(z.array(z.string())),
          questionType: z.nativeEnum(QuestionType),
        })
        .refine((questionRes) => {
          if (questionRes.questionType === QuestionType.checkboxes) {
            if (!Array.isArray(questionRes.answer)) return false;
          } else {
            if (typeof questionRes.answer !== "string") return false;
          }

          return true;
        }, "Invalid input format.")
    ),
    collectorId: z.string().or(z.null()),
    pageId: z.string(),
    isPreview: z.boolean(),
    surveyResposneStartTime: z.coerce.date(),
  })
  .refine((values) => {
    if (values.isPreview && typeof values.collectorId === "string")
      return false;
    if (!values.isPreview && typeof values.collectorId !== "string")
      return false;

    return true;
  }, "Invalid input format.");

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
    }
  );

export const updateQuestionSchema = z.object({
  data: z
    .object({
      type: z.nativeEnum(QuestionType),
      description: z
        .string()
        .trim()
        .min(1, "You must enter question description.")
        .max(2500, "Description can have max of 2500 characters."),
      descriptionImage: z.string().or(z.null()),
      id: z.string(),
      required: z.boolean(),
      randomize: z.boolean().optional(),
      options: z
        .array(
          z.object({
            id: z.string().optional(),
            description: z
              .string()
              .trim()
              .min(1, "You must enter option text.")
              .max(2500, "Description can have max of 2500 characters."),
            descriptionImage: z.string().or(z.null()),
            number: z.number().positive(),
          })
        )
        .nonempty("You must add at least one option.")
        .max(30, "Max. number of options is 30.")
        .optional(),
    })
    .refine((values) => {
      if (
        values.type === QuestionType.textbox &&
        (values.options !== undefined || values.randomize !== undefined)
      )
        return false;
      if (
        values.type !== QuestionType.textbox &&
        (values.randomize === undefined || values.options === undefined)
      )
        return false;

      return true;
    }),
});

export const createQuestionSchema = z.object({
  data: z
    .object({
      type: z.nativeEnum(QuestionType),
      description: z
        .string()
        .trim()
        .min(1, "You must enter question description.")
        .max(2500, "Description can have max of 2500 characters."),
      descriptionImage: z.string().or(z.null()),
      required: z.boolean(),
      randomize: z.boolean().optional(),
      options: z
        .array(
          z.object({
            id: z.string().optional(),
            description: z
              .string()
              .trim()
              .min(1, "You must enter option text.")
              .max(2500, "Description can have max of 2500 characters."),
            descriptionImage: z.string().or(z.null()),
            number: z.number().positive(),
          })
        )
        .nonempty("You must add at least one option.")
        .max(30, "Max. number of options is 30.")
        .optional(),
    })
    .refine((values) => {
      if (
        values.type === QuestionType.textbox &&
        (values.options !== undefined || values.randomize !== undefined)
      )
        return false;
      if (
        values.type !== QuestionType.textbox &&
        (values.randomize === undefined || values.options === undefined)
      )
        return false;

      return true;
    }),
  pageId: z.string(),
});
