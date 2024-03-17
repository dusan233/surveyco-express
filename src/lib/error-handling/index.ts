import { HttpStatusCode } from "../../types/types";
import * as Http from "http";
import * as util from "util";
import { Response } from "express";

let httpServerRef: Http.Server;

const errorHandler = {
  // Listen to the global process-level error events
  listenToErrorEvents: (httpServer: Http.Server) => {
    httpServerRef = httpServer;
    process.on("uncaughtException", async (error) => {
      errorHandler.handleError(error);
    });

    process.on("unhandledRejection", async (reason) => {
      errorHandler.handleError(reason);
    });

    process.on("SIGTERM", async () => {
      // use logger

      await terminateHttpServerAndExit();
    });

    process.on("SIGINT", async () => {
      // use logger

      await terminateHttpServerAndExit();
    });
  },

  handleError: (errorToHandle: unknown) => {
    try {
      const appError: AppError = normalizeError(errorToHandle);
      //logger error here

      if (!appError.isTrusted) {
        terminateHttpServerAndExit();
      }

      return appError;
    } catch (handlingError: unknown) {
      // Not using the logger here because it might have failed
      process.stdout.write(
        "The error handler failed, here are the handler failure and then the origin error that it tried to handle"
      );
      process.stdout.write(JSON.stringify(handlingError));
      process.stdout.write(JSON.stringify(errorToHandle));
    }
  },
  handleErrorResponse: (error: AppError, res: Response) => {
    const errorObj = {
      error: {
        message: error.message,
        code: error.name,
      },
    };

    return res.status(error.HTTPStatus || 500).json(errorObj);
  },
};

const terminateHttpServerAndExit = async () => {
  // maybe implement more complex logic here (like using 'http-terminator' library)
  if (httpServerRef) {
    await httpServerRef.close();
  }
  process.exit(1);
};

const normalizeError = (errorToHandle: unknown): AppError => {
  if (errorToHandle instanceof AppError) {
    return errorToHandle;
  }
  if (errorToHandle instanceof Error) {
    const appError = new AppError(errorToHandle.name, errorToHandle.message);
    appError.stack = errorToHandle.stack;
    return appError;
  }
  // meaning it could be any type,
  const inputType = typeof errorToHandle;
  return new AppError(
    "general-error",
    `Error Handler received a none error instance with type - ${inputType}, value - ${util.inspect(
      errorToHandle
    )}`
  );
};

class AppError extends Error {
  constructor(
    public name: string,
    public message: string,
    public HTTPStatus: HttpStatusCode = 500,
    public isTrusted = true,
    public cause?: unknown
  ) {
    super(message);
  }
}

export { errorHandler, AppError };
