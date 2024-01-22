import { z } from "zod";
import {
  CollectorType,
  OperationPosition,
  QuestionType,
  SurveyCategory,
} from "../../../types/types";

export const createQuizSchema = z.object({
  title: z.string().min(1, "You must enter survey title."),
  category: z.nativeEnum(SurveyCategory).or(z.literal("")),
});

export const createSurveyCollectorSchema = z.object({
  type: z.nativeEnum(CollectorType),
});

export const getQuestionResultsSchema = z.object({
  questionIds: z.array(z.string()),
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
  submit: z.boolean().optional(),
  surveyResposneStartTime: z.coerce.date(),
});

export const surveyResponseQuestionResponseSchema = z.object({
  questionsIds: z.array(z.string()),
});

export const questionSchema = z.object({
  type: z.nativeEnum(QuestionType),
  description: z.string().min(1, "You must enter question description."),
  descriptionImage: z.string().or(z.null()),
  required: z.boolean(),
  id: z.string().optional(),
});

export const multiChoiceQuestionSchema = questionSchema.extend({
  options: z
    .array(
      z.object({
        id: z.string().optional(),
        description: z.string().min(1, "You must enter option text."),
        descriptionImage: z.string().or(z.null()),
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
    descriptionImage: z.string().or(z.null()),
    required: z.boolean(),
    id: z.string(),
  }),
});

export const createQuestionSchema = z.object({
  data: z.object({
    type: z.nativeEnum(QuestionType),
    description: z.string().min(1, "You must enter question description."),
    descriptionImage: z.string().or(z.null()),
    required: z.boolean(),
  }),
  pageId: z.string(),
});

export const saveMultiChoiceQuestionSchema = z.object({
  data: multiChoiceQuestionSchema,
  pageId: z.string().optional(),
});
