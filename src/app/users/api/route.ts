import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import express from "express";

const router = express.Router();

router.get("/:userId/surveys", ClerkExpressRequireAuth());

export default router;
