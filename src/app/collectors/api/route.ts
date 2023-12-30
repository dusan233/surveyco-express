import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import express from "express";
import { asyncHandler, validate } from "../../../lib/middlewares";
import {
  createSurveyCollectorSchema,
  updateSurveyCollectorSchema,
  updateSurveyCollectorStatusSchema,
} from "./schemaValidation";
import collectorController from "./controller";

const router = express.Router();

router.post(
  "/",
  ClerkExpressRequireAuth(),
  validate(createSurveyCollectorSchema),
  asyncHandler(collectorController.createSurveyCollectorHandler)
);
router.put(
  "/:collectorId/status",
  ClerkExpressRequireAuth(),
  validate(updateSurveyCollectorStatusSchema),
  asyncHandler(collectorController.updateSurveyCollectorStatusHandler)
);
router.put(
  "/:collectorId",
  ClerkExpressRequireAuth(),
  validate(updateSurveyCollectorSchema),
  asyncHandler(collectorController.updateSurveyCollectorHandler)
);
router.delete(
  "/:collectorId",
  ClerkExpressRequireAuth(),
  asyncHandler(collectorController.deleteSurveyCollectorHandler)
);
router.get(
  "/:collectorId",
  asyncHandler(collectorController.getSurveyCollectorHandler)
);

export default router;
