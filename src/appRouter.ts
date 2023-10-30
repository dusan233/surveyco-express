import express from "express";
import quizzesRouter from "./app/quizzes/api/route";

const appRouter = express.Router();

appRouter.use("/quiz", quizzesRouter);

export default appRouter;
