import { z } from "zod";
import { QuestionType } from "../../../types/types";

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
