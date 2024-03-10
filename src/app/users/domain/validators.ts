import { AppError } from "@/lib/error-handling";
import { HttpStatusCode } from "@/types/types";
import { userSurveysQueryParamsSchema } from "./schema-validation";

export const validateUserSurveysQueryParams = (queryParams: {
  [key: string]: string;
}) => {
  try {
    const validatedQParams = userSurveysQueryParamsSchema.parse(queryParams);
    return validatedQParams;
  } catch (err) {
    throw new AppError(
      "BadRequest",
      "Invalid inputs.",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  }
};
