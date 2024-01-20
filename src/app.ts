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
import cookieParser from "cookie-parser";
import "dotenv/config";
import formidable from "formidable";
import { promises as fs } from "fs";
import { s3Client } from "./s3-client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { RequestWithFiles, validateQuestionData } from "./lib/middlewares";

const app = express();

app.set("trust proxy", true);

app.use(cookieParser("secrekey1239dkfsak00010"));
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000", "http://localhost:5173"],
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.put(
  "/tuku/:surveyId",
  validateQuestionData(),
  async (req: Request, res, next) => {
    return res.status(200).json({ ds: "ds", body: req.body, files: req.files });
  }
);

app.post("/dadli", async (req, res, next) => {
  const form = formidable({});

  const [fields, files] = await form.parse(req);

  const file = files.image![0];
  const filePath = file.filepath;
  let rawData = await fs.readFile(filePath);

  const result = await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_BUCKETNAME,
      Key: "slicica.jpeg",
      Body: rawData,
    })
  );

  return res.json({ files, fields, result });

  // form.parse(req, async (err, fields, files) => {
  //   if (err) {
  //     return next(err);
  //   }
  //   const filePath = files.image![0].filepath;
  //   let rawData = await fs.readFile(filePath);
  //   return res.json({ fields, files, dw: dwq[0], qw: dwq[1] });
  // });

  // return res.status(200).json({ res: "ds" });
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
