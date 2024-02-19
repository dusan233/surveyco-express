import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import express from "express";
import { asyncHandler } from "../../../lib/middlewares";
import collectorController from "./controller";

const router = express.Router();

router.post(
  "/",
  ClerkExpressRequireAuth(),
  asyncHandler(collectorController.createSurveyCollectorHandler)
);
router.put(
  "/:collectorId/status",
  ClerkExpressRequireAuth(),
  asyncHandler(collectorController.updateSurveyCollectorStatusHandler)
);
router.put(
  "/:collectorId",
  ClerkExpressRequireAuth(),
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
