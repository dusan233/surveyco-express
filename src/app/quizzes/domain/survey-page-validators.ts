import { AppError } from "@/lib/error-handling";
import { HttpStatusCode } from "@/types/types";

export const assertMaxPagesNotExceeded = (pageCount: number) => {
  if (pageCount === 20)
    throw new AppError(
      "MaxPagesExceeded",
      "Max number of pages per survey is 20.",
      HttpStatusCode.BAD_REQUEST,
      true
    );
};

export const assertMaxQuestionsPerPageNotExceeded = (questionCount: number) => {
  if (questionCount === 50)
    throw new AppError(
      "BadRequest",
      "Max number of questions per page is 50.",
      HttpStatusCode.BAD_REQUEST,
      true
    );
};
