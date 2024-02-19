import { z } from "zod";
import {
  createQuizSchema,
  getQuestionResultsSchema,
  placePageSchema,
  placeQuestionSchema,
  saveSurveyResponseSchema,
  surveyResponseQuestionResponseSchema,
} from "../app/quizzes/api/schemaValidation";
import {
  updateSurveyCollectorSchema,
  updateSurveyCollectorStatusSchema,
} from "../app/collectors/api/schemaValidation";
import { SurveyRecord } from "../app/quizzes/data-access/survey-repository";

export type CreateSurveyData = z.infer<typeof createQuizSchema>;
export type CreateSurveyDTO = CreateSurveyData & { userId: string };
export type OrderByObject = { column: string; type: "asc" | "desc" };

export type CollectrorRecord = {
  id: string;
  type: string;
  created_at: Date;
  updated_at: Date | null;
  status: string;
  name: string;
  surveyId: string;
};
export type SurveyDTO = SurveyRecord & {
  responses_count: number;
  page_count: number;
  question_count: number;
  survey_status: SurveyStatus;
};

export type SurveyCollectorsDTO = {
  data: (CollectrorRecord & {
    total_responses: number;
  })[];
  total_pages: number;
  collector_count: number;
};

export type UserSurveysDTO = {
  data: (SurveyRecord & {
    question_count: number;
    responses_count: number;
    page_count: number;
  })[];
  total_pages: number;
};

export interface SurveyParams {
  surveyId: string;
}
export interface UserParams {
  userId: string;
}
export interface SurveyQuestionParams extends SurveyParams {
  questionId: string;
}

export interface CollectorParams extends SurveyParams {
  collectorId: string;
}
export interface SurveyPageParams extends SurveyParams {
  pageId: string;
}

export type PlaceQuestionReqBody = z.infer<typeof placeQuestionSchema>;
export type PlacePageReqBody = z.infer<typeof placePageSchema>;
export type SurveyResponseQuestionResponsesBody = z.infer<
  typeof surveyResponseQuestionResponseSchema
>;

export interface QuestionBase {
  id?: string;
  type: QuestionType;
  description: string;
  descriptionImage: string | null;
  required: boolean;
}
export interface MultiChoiceQuestion extends QuestionBase {
  options: Option[];
  randomize: boolean;
}

export type Question = QuestionBase | MultiChoiceQuestion;

export interface Option {
  description: string;
  descriptionImage: string | null;
  id?: string;
}
export enum QuestionType {
  multiple_choice = "multiple_choice",
  checkboxes = "checkbox",
  dropdown = "dropdown",
  textbox = "textbox",
}

export enum SurveyCategory {
  market_research = "market_research",
  academic_research = "academic_research",
  student_feedback = "student_feedback",
  event_feedback = "event_feedback",
  customer_feedback = "customer_feedback",
}

export enum OperationPosition {
  after = "after",
  before = "before",
}

export enum CollectorStatus {
  open = "open",
  closed = "closed",
}

export enum SurveyStatus {
  open = "open",
  close = "close",
  draft = "draft",
}

export enum CollectorType {
  web_link = "web_link",
}

export type SaveSurveyResponseRequestBody = z.infer<
  typeof saveSurveyResponseSchema
>;
export type UpdateCollectorStatusRequestBody = z.infer<
  typeof updateSurveyCollectorStatusSchema
>;
export type UpdateCollectorRequestBody = z.infer<
  typeof updateSurveyCollectorSchema
>;
export type GetQuestionResultsRequestBody = z.infer<
  typeof getQuestionResultsSchema
>;

export enum HttpStatusCode {
  CONTINUE = 100,

  SWITCHING_PROTOCOLS = 101,

  PROCESSING = 102,

  OK = 200,

  CREATED = 201,

  ACCEPTED = 202,

  NON_AUTHORITATIVE_INFORMATION = 203,

  NO_CONTENT = 204,

  RESET_CONTENT = 205,

  PARTIAL_CONTENT = 206,

  MULTI_STATUS = 207,

  ALREADY_REPORTED = 208,

  IM_USED = 226,

  MULTIPLE_CHOICES = 300,

  MOVED_PERMANENTLY = 301,

  FOUND = 302,

  SEE_OTHER = 303,

  NOT_MODIFIED = 304,

  USE_PROXY = 305,

  SWITCH_PROXY = 306,

  TEMPORARY_REDIRECT = 307,

  PERMANENT_REDIRECT = 308,

  BAD_REQUEST = 400,

  UNAUTHORIZED = 401,

  PAYMENT_REQUIRED = 402,

  FORBIDDEN = 403,

  NOT_FOUND = 404,

  METHOD_NOT_ALLOWED = 405,

  NOT_ACCEPTABLE = 406,

  PROXY_AUTHENTICATION_REQUIRED = 407,

  REQUEST_TIMEOUT = 408,

  CONFLICT = 409,

  GONE = 410,

  LENGTH_REQUIRED = 411,

  PRECONDITION_FAILED = 412,

  PAYLOAD_TOO_LARGE = 413,

  URI_TOO_LONG = 414,

  UNSUPPORTED_MEDIA_TYPE = 415,

  RANGE_NOT_SATISFIABLE = 416,

  EXPECTATION_FAILED = 417,

  I_AM_A_TEAPOT = 418,
  MISDIRECTED_REQUEST = 421,
  UNPROCESSABLE_ENTITY = 422,
  LOCKED = 423,
  FAILED_DEPENDENCY = 424,
  UPGRADE_REQUIRED = 426,
  PRECONDITION_REQUIRED = 428,
  TOO_MANY_REQUESTS = 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE = 431,
  UNAVAILABLE_FOR_LEGAL_REASONS = 451,
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
  HTTP_VERSION_NOT_SUPPORTED = 505,
  VARIANT_ALSO_NEGOTIATES = 506,
  INSUFFICIENT_STORAGE = 507,
  LOOP_DETECTED = 508,
  NOT_EXTENDED = 510,
  NETWORK_AUTHENTICATION_REQUIRED = 511,
}
