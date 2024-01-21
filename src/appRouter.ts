import express from "express";
import quizzesRouter from "./app/quizzes/api/route";
import collectorRouter from "./app/collectors/api/route";
import userRouter from "./app/users/api/route";
import mediaRouter from "./app/media/api/route";

const appRouter = express.Router();

appRouter.use("/quiz", quizzesRouter);
appRouter.use("/collector", collectorRouter);
appRouter.use("/user", userRouter);
appRouter.use("/media", mediaRouter);

export default appRouter;
