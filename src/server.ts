import { AddressInfo } from "net";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import appRouter from "./appRouter";
import path from "path";
import bodyParser from "body-parser";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/clerk-sdk-node";
import prisma from "./prismaClient";
import { errorHandler } from "./lib/error-handling";
import { Server } from "http";
import "./global-express";
import config from "./config";
import helmet from "helmet";

let connection: Server;
async function startWebServer(): Promise<AddressInfo> {
  config.validate();

  const app = express();

  app.set("trust proxy", true);

  app.use(cookieParser(config.get("cookieParser.secretKey")));
  app.use(
    cors({
      credentials: true,
      origin: [config.get("client.frontendUrl")],
      optionsSuccessStatus: 200,
    })
  );
  app.use(helmet());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  app.use(appRouter);

  app.post(
    "/webhook",
    bodyParser.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const payload = JSON.stringify(req.body);
        const headers = req.headers as any;

        const wh = new Webhook(config.get("clerkAuth.webhookSecretKey"));

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

  defineErrorHandlingMiddleware(app);
  const APIAddress = await openConnection(app);
  return APIAddress;
}

async function openConnection(
  expressApp: express.Application
): Promise<AddressInfo> {
  return new Promise((resolve) => {
    const webServerPort = 8080;

    connection = expressApp.listen(webServerPort, () => {
      errorHandler.listenToErrorEvents(connection);
      resolve(connection.address() as AddressInfo);
    });
  });
}

function defineErrorHandlingMiddleware(expressApp: express.Application) {
  expressApp.use(
    async (
      error: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (error && typeof error === "object") {
        if (error.isTrusted === undefined || error.isTrusted === null) {
          error.isTrusted = true; // Error during a specific request is usually not fatal and should not lead to process exit
        }
      }

      const appError = errorHandler.handleError(error);
      errorHandler.handleErrorResponse(appError!, res);
    }
  );
}

export { startWebServer };
