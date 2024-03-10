import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import express from "express";
import { asyncHandler } from "@/lib/middlewares";
import userController from "./controller";

const router = express.Router();

router.get(
  "/:userId/surveys",
  ClerkExpressRequireAuth(),
  asyncHandler(userController.getUserSurveysHandler)
);

export default router;
