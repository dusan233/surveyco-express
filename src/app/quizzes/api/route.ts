import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import express from "express";
import {
  asyncHandler,
  validate,
  validateQuestionType,
} from "../../../lib/middlewares";
import {
  createQuizSchema,
  createSurveyCollectorSchema,
  questionSchema,
  saveQuestionSchema,
  saveSurveyResponseSchema,
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
router.delete(
  "/:surveyId/question/:questionId",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.deleteSurveyQuestionHandler)
);

export default router;
