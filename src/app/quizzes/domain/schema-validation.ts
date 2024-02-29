import { z } from "zod";
import { OperationPosition, QuestionType } from "../../../types/types";

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
        .min(1, "You must enter question description."),
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
              .min(1, "You must enter option text."),
            descriptionImage: z.string().or(z.null()),
          })
        )
        .nonempty("You must add at least one option.")
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
        .min(1, "You must enter question description."),
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
              .min(1, "You must enter option text."),
            descriptionImage: z.string().or(z.null()),
          })
        )
        .nonempty("You must add at least one option.")
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
