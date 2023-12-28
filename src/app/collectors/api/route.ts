import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import express from "express";
import { asyncHandler, validate } from "../../../lib/middlewares";
import { createSurveyCollectorSchema } from "./schemaValidation";
import collectorController from "./controller";

const router = express.Router();

router.post(
  "/",
  ClerkExpressRequireAuth(),
  validate(createSurveyCollectorSchema),
  asyncHandler(collectorController.createSurveyCollectorHandler)
);
// router.get(
//   "/:collectorId",
//   asyncHandler(quizController.getSurveyCollectorHandler)
// );

export default router;
