import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import express from "express";
import { asyncHandler } from "../../../lib/middlewares";

import quizController from "./controller";

const router = express.Router();

router.get(
  "/:surveyId",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.getSurveyHandler)
);
router.get(
  "/:surveyId/questions",
  asyncHandler(quizController.getSurveyQuestionsHandler)
);

router.post(
  "/create-quiz",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.createSurveyHandler)
);

//collectors
router.get(
  "/:surveyId/collectors",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.getSurveyCollectorsHandler)
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
  asyncHandler(quizController.copySurveyPageHandler)
);
router.put(
  "/:surveyId/page/:pageId/move",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.moveSurveyPageHandler)
);

//results
router.get(
  "/:surveyId/questions/result",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.getPageQuestionResultsHandler)
);

router.get(
  "/:surveyId/responses",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.getSurveyResponsesHandler)
);
router.get(
  "/:surveyId/responses/volume",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.getSurveyResponsesVolumeHandler)
);

router.get(
  "/:surveyId/response/:responseId",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.getSurveyResponseHandler)
);

//survey response
router.put(
  "/:surveyId/response",
  asyncHandler(quizController.saveSurveyResponseHandler)
);
router.get(
  "/:surveyId/responseData",
  quizController.getSurveyQuestionsAndResponsesHandler
);

//survey pages
router.post(
  "/:surveyId/page",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.createSurveyPageHandler)
);

//questions
router.post(
  "/:surveyId/question",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.createQuestionHandler)
);
router.put(
  "/:surveyId/question",
  ClerkExpressRequireAuth(),
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
  asyncHandler(quizController.copyQuestionHandler)
);
router.put(
  "/:surveyId/question/:questionId/move",
  ClerkExpressRequireAuth(),
  asyncHandler(quizController.moveQuestionHandler)
);

export default router;
