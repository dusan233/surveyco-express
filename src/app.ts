import express, { NextFunction, Request, Response } from "express";
import path from "path";
import cors from "cors";
import prisma from "./prismaClient";
import "./dickinurmouth";
import bodyParser from "body-parser";
import { Webhook } from "svix";
import { type WebhookEvent } from "@clerk/clerk-sdk-node";
import appRouter from "./appRouter";
import { AppError, errorHandler } from "./lib/errors";

import session from "express-session";
import { redisStore } from "./redis";

const app = express();

app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  console.log(req.headers, "dusane na kurac");
  next();
});

app.use(
  session({
    name: "kurac",
    // store: redisStore,
    resave: false, // required: force lightweight session keep alive (touch)
    saveUninitialized: true, // recommended: only save session when data exists
    secret: "session_secret",
    cookie: {
      secure: false,
      httpOnly: false,
      maxAge: 60 * 60 * 60,
      domain: "http://localhost:3000",
      sameSite: "none",
    },
  })
);

// app.use((req, res, next) => {
//   console.log(req.session.id, "dusane na kurac");
//   next();
// });

app.post("/create-user", async (req, res) => {
  return res.json({ data: "asas" });
});

app.use(appRouter);

app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const payload = JSON.stringify(req.body);
      const headers = req.headers as any;

      const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET_KEY!);

      const evt = wh.verify(payload, headers) as WebhookEvent;

      const eventType = evt.type;
      if (eventType === "user.created") {
        //add to database data about user.
        await prisma.user.create({
          data: {
            id: evt.data.id,
            email: evt.data.email_addresses[0].email_address,
            created_at: new Date(evt.data.created_at),
            updated_at: new Date(evt.data.created_at),
            last_sign_in_at: new Date(evt.data.last_sign_in_at || 0),
            first_name: evt.data.first_name,
            last_name: evt.data.last_name,
          },
        });
        console.log("korisnik kreiran");
      }
      //  else if (eventType === "user.deleted") {
      //   await prisma.user.delete({ where: { id: evt.data.id } });
      //   console.log("user deleted");
      // }
      res.status(200).json({
        success: true,
        message: "Webhook received",
      });
    } catch (err) {
      console.log(err);
      res.status(400).json({
        success: false,
        message: "webhook error msg",
      });
    }
  }
);

app.use(
  async (err: AppError, req: Request, res: Response, next: NextFunction) => {
    console.log(err.message, "ova greska");
    await errorHandler.handleError(err, res);
  }
);

process.on("unhandledRejection", (reason: string, p: Promise<any>) => {
  // I just caught an unhandled promise rejection,
  // since we already have fallback handler for unhandled errors (see below),
  // let throw and let him handle that
  console.log("unhandledRejection");
  throw reason;
});

process.on("uncaughtException", (error: Error) => {
  // I just received an error that was never handled, time to handle it and then decide whether a restart is needed
  console.log("uncaughtException");
  if (!errorHandler.isTrustedError(error)) process.exit(1);
});

export default app;
