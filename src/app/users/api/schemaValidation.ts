import { z } from "zod";

export const userSurveysQueryParamsSchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .transform((value) => parseInt(value)),
  sort: z
    .string()
    .regex(
      /^(title|updated_at|created_at|responses_count|question_count):(asc|desc)$/
    )
    .transform((value) => {
      const [columnName, type] = value.split(":");
      return { column: columnName, type: type as "asc" | "desc" };
    }),
});
