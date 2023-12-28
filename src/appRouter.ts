import express from "express";
import quizzesRouter from "./app/quizzes/api/route";
import collectorRouter from "./app/collectors/api/route";

const appRouter = express.Router();

appRouter.use("/quiz", quizzesRouter);
appRouter.use("/collector", collectorRouter);

export default appRouter;
