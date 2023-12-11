import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import express from "express";
import {
  asyncHandler,
  validate,
  validateQuestionType,
} from "../../../lib/middlewares";
import {
  createQuestionSchema,
  createQuizSchema,
  createSurveyCollectorSchema,
  placePageSchema,
  placeQuestionSchema,
  questionSchema,
  saveQuestionSchema,
  saveSurveyResponseSchema,
  updateQuestionSchema,
} from "./schemaValidation";
import quizController from "./controller";
import prisma from "../../../prismaClient";

const router = express.Router();

router.get(
  "/:surveyId",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.getSurveyHandler)
);
router.get(
  "/:surveyId/questions",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.getSurveyQuestionsHandler)
);

router.post(
  "/create-quiz",
  ClerkExpressRequireAuth(),
  validate(createQuizSchema),
  asyncHandler(quizController.createQuizHandler)
);
//survey pages

router.get(
  "/:surveyId/pages",
  asyncHandler(quizController.getSurveyPagesHandler)
);
router.delete(
  "/:surveyId/page/:pageId",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.deleteSurveyPageHandler)
);
router.post(
  "/:surveyId/page/:pageId/copy",
  ClerkExpressRequireAuth(),
  validate(placePageSchema),
  asyncHandler(quizController.copySurveyPageHandler)
);

//results
router.get(
  "/:surveyId/results",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.getSurveyResponsesHandler)
);

//collector
router.post(
  "/:surveyId/collector",
  ClerkExpressRequireAuth(),
  validate(createSurveyCollectorSchema),
  asyncHandler(quizController.createSurveyCollectorHandler)
);
router.get(
  "/:surveyId/collector/:collectorId",
  asyncHandler(quizController.getSurveyCollectorHandler)
);
router.put(
  "/:surveyId/collector/:collectorId",
  validate(saveSurveyResponseSchema),
  asyncHandler(quizController.saveSurveyResponseHandler)
);

//survey pages
router.post(
  "/:surveyId/page",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.createSurveyPageHandler)
);

//questions
router.put(
  "/:quizId/save-question",
  ClerkExpressRequireAuth(),
  validate(saveQuestionSchema),
  validateQuestionType,
  asyncHandler(quizController.saveQuestionHandler)
);

router.post(
  "/:surveyId/question",
  ClerkExpressRequireAuth(),
  validate(createQuestionSchema, true),
  validateQuestionType,
  asyncHandler(quizController.createQuestionHandler)
);
router.put(
  "/:surveyId/question",
  ClerkExpressRequireAuth(),
  validate(updateQuestionSchema, true),
  validateQuestionType,
  asyncHandler(quizController.updateQuestionHandler)
);
router.delete(
  "/:surveyId/question/:questionId",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.deleteSurveyQuestionHandler)
);
router.post(
  "/:surveyId/question/:questionId/copy",
  ClerkExpressRequireAuth(),
  validate(placeQuestionSchema),
  asyncHandler(quizController.copyQuestionHandler)
);
router.put(
  "/:surveyId/question/:questionId/move",
  ClerkExpressRequireAuth(),
  validate(placeQuestionSchema),
  asyncHandler(quizController.moveQuestionHandler)
);

export default router;
