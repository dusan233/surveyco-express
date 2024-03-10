import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import express from "express";
import { asyncHandler } from "@/lib/middlewares";
import mediaController from "./controller";

const router = express.Router();

router.post(
  "/create",
  ClerkExpressRequireAuth(),
  asyncHandler(mediaController.uploadMediaHandler)
);

export default router;
