import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import express from "express";
import {
  asyncHandler,
  validate,
  validateQuestionType,
} from "../../../lib/middlewares";
import { createQuizSchema, questionSchema } from "./schemaValidation";
import quizController from "./controller";

const router = express.Router();

router.post(
  "/create-quiz",
  ClerkExpressRequireAuth(),
  validate(createQuizSchema),
  asyncHandler(quizController.createQuizHandler)
);

router.put(
  "/:quizId/save-question",
  ClerkExpressRequireAuth(),
  validate(questionSchema),
  validateQuestionType,
  asyncHandler(quizController.saveQuestionHandler)
);

export default router;
