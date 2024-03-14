import { Question, QuestionOption, SurveyPage } from "@prisma/client";
import { AppError } from "@/lib/error-handling";
import {
  HttpStatusCode,
  QuestionType,
  SaveSurveyResponseData,
} from "@/types/types";
import { SurveyRecord } from "../data-access/survey-repository";
import {
  createQuestionSchema,
  createSurveySchema,
  placePageSchema,
  placeQuestionSchema,
  saveSurveyResponseSchema,
  savedQuestionResponsesQueryParamsSchema,
  surveyCollectorsQueryParamsSchema,
  surveyResponsesQueryParamsSchema,
  updateQuestionSchema,
} from "./schema-validation";

export const validateNewSurvey = (newSurvey: unknown) => {
  try {
    const data = createSurveySchema.parse(newSurvey);
    return data;
  } catch (err) {
    throw new AppError(
      "BadRequest",
      "Invalid arguments for survey creation",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  }
};

export const validateUpdateQuestion = (updateQuestion: unknown) => {
  try {
    const data = updateQuestionSchema.parse(updateQuestion);
    return data;
  } catch (err) {
    throw new AppError(
      "BadRequest",
      "Invalid inputs for question creation",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  }
};

export const validateCreateQuestion = (newQuestion: unknown) => {
  try {
    const data = createQuestionSchema.parse(newQuestion);
    return data;
  } catch (err) {
    throw new AppError(
      "BadRequest",
      "Invalid inputs for question creation",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  }
};

export const validatePlacePage = (data: unknown) => {
  try {
    const validData = placePageSchema.parse(data);
    return validData;
  } catch (err) {
    throw new AppError(
      "BadRequest",
      "Invalid inputs for page placement.",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  }
};

export const validatePlaceQuestion = (data: unknown) => {
  try {
    const validData = placeQuestionSchema.parse(data);
    return validData;
  } catch (err) {
    throw new AppError(
      "BadRequest",
      "Invalid inputs for question creation",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  }
};

export const validateSaveSurveyResponse = (
  saveSurveyResponse: SaveSurveyResponseData
) => {
  try {
    const data = saveSurveyResponseSchema.parse(saveSurveyResponse);
    return data;
  } catch (err) {
    throw new AppError(
      "BadRequest",
      "Invalid arguments for survey creation",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  }
};

export const assertCollectorNotFinished = (
  blockedCollectors: string[],
  collectorId: string
) => {
  if (blockedCollectors.includes(collectorId)) {
    throw new AppError(
      "Unauthorized",
      "Already finished taking of this survey collector!",
      HttpStatusCode.UNAUTHORIZED,
      true
    );
  }
};

export const assertSurveyExists = (survey: SurveyRecord | null) => {
  if (!survey)
    throw new AppError(
      "NotFound",
      "Resource not found.",
      HttpStatusCode.NOT_FOUND,
      true
    );
};

export const assertPageExists = (survyePage: SurveyPage | null) => {
  if (!survyePage)
    throw new AppError(
      "NotFound",
      "Resource not found.",
      HttpStatusCode.NOT_FOUND,
      true
    );
};

export const assertQuestionExists = (question: Question | null) => {
  if (!question)
    throw new AppError(
      "NotFound",
      "Resource not found.",
      HttpStatusCode.NOT_FOUND,
      true
    );
};

export const assertQuestionBelongsToPage = (
  question: Question,
  pageId: string
) => {
  if (question.surveyPageId !== pageId)
    throw new AppError(
      "BadRequest",
      "Question doesnt belong to page.",
      HttpStatusCode.BAD_REQUEST,
      true
    );
};

export const assertQuestionBelongsToSurvey = (
  question: Question,
  surveyId: string
) => {
  if (question.quizId !== surveyId)
    throw new AppError(
      "Unauthorized",
      "Already finished taking of this survey collector!",
      HttpStatusCode.UNAUTHORIZED,
      true
    );
};

export const isTextboxQuestionResponseValid = (
  questionResponse: {
    questionId: string;
    answer: (string | string[]) & (string | string[] | undefined);
    questionType: QuestionType;
    id?: string | undefined;
  },
  question: Question
) => {
  let isValid = true;

  if (question.required) {
    isValid = (questionResponse.answer as string).trim() !== "";
  }

  return isValid;
};

export const isMultichoiceQuestionResponseValid = (
  questionResponse: {
    questionId: string;
    answer: (string | string[]) & (string | string[] | undefined);
    questionType: QuestionType;
    id?: string | undefined;
  },
  question: Question & { options?: QuestionOption[] }
) => {
  let isValid = false;

  if (question.required) {
    isValid = question
      .options!.map((option) => option.id)
      .includes(questionResponse.answer as string);
  } else {
    isValid =
      question
        .options!.map((option) => option.id)
        .includes(questionResponse.answer as string) ||
      (questionResponse.answer as string).trim() === "";
  }
  return isValid;
};

export const isCheckboxQuestionResponseValid = (
  questionResponse: {
    questionId: string;
    answer: (string | string[]) & (string | string[] | undefined);
    questionType: QuestionType;
    id?: string | undefined;
  },
  question: Question & { options?: QuestionOption[] }
) => {
  let isValid = true;
  if (question.required) {
    isValid = false;

    if ((questionResponse.answer as string[]).length === 0) return;

    const validAnswers = (questionResponse.answer as string[]).map((answer) => {
      if (question.options!.map((option) => option.id).includes(answer))
        return true;

      return false;
    });

    isValid = !validAnswers.includes(false);
  } else {
    const validAnswers = (questionResponse.answer as string[]).map((answer) => {
      if (question.options!.map((option) => option.id).includes(answer))
        return true;

      return false;
    });

    isValid = !validAnswers.includes(false);
  }

  return isValid;
};

export const assertQuestionResponsesDataIsValid = (
  questionResponses: {
    questionId: string;
    answer: (string | string[]) & (string | string[] | undefined);
    questionType: QuestionType;
    id?: string | undefined;
  }[],
  questions: (Question & { options?: QuestionOption[] })[]
) => {
  if (questionResponses.length !== questions.length)
    throw new AppError(
      "BadRequest",
      "Invalid inputs.",
      HttpStatusCode.BAD_REQUEST,
      true
    );

  const validQuestionsList = questions.map((q) => {
    const isValid = true;
    const questionResponse = questionResponses.find(
      (qRes) => qRes.questionId === q.id
    );

    if (!questionResponse) return false;

    if (q.type === QuestionType.checkboxes) {
      return isCheckboxQuestionResponseValid(questionResponse, q);
    } else if (
      [QuestionType.dropdown, QuestionType.multiple_choice].includes(
        q.type as QuestionType
      )
    ) {
      return isMultichoiceQuestionResponseValid(questionResponse, q);
    } else if (q.type === QuestionType.textbox) {
      return isTextboxQuestionResponseValid(questionResponse, q);
    }

    return isValid;
  });
  if (validQuestionsList.includes(false))
    throw new AppError(
      "BadRequest",
      "Invalid inputs.",
      HttpStatusCode.BAD_REQUEST,
      true
    );
};

export const assertPageBelongsToSurvey = (
  surveyPage: SurveyPage,
  surveyId: string
) => {
  if (surveyPage.surveyId !== surveyId)
    throw new AppError(
      "BadRequest",
      "Invalid inputs.",
      HttpStatusCode.BAD_REQUEST,
      true
    );
};

export const assertUserCreatedSurvey = (
  survey: SurveyRecord,
  userId: string
) => {
  if (survey.creatorId !== userId)
    throw new AppError(
      "Unauthorized",
      "Unauthorized access.",
      HttpStatusCode.UNAUTHORIZED,
      true
    );
};

export const validateSurveyResponsesQueryParams = (queryParams: {
  [key: string]: string;
}) => {
  try {
    const validatedQParams =
      surveyResponsesQueryParamsSchema.parse(queryParams);
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

export const validatesavedQuestionResponsesQueryParams = (
  queryParams: unknown
) => {
  try {
    const validatedQParams =
      savedQuestionResponsesQueryParamsSchema.parse(queryParams);
    return validatedQParams;
  } catch (err) {
    console.log(err);
    throw new AppError(
      "BadRequest",
      "Invalid inputs.",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  }
};

export const validateSurveyCollectorsQueryParams = (queryParams: {
  [key: string]: string;
}) => {
  try {
    const validatedQParams =
      surveyCollectorsQueryParamsSchema.parse(queryParams);
    return validatedQParams;
  } catch (err) {
    console.log(err);
    throw new AppError(
      "BadRequest",
      "Invalid inputs.",
      HttpStatusCode.BAD_REQUEST,
      true
    );
  }
};
