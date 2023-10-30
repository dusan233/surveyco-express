import { Response } from "express";
import { HttpStatusCode } from "../types/types";

export class AppError extends Error {
  public readonly commonType: string;
  public readonly name: string;
  public readonly httpCode: HttpStatusCode;
  public readonly isOperational: boolean;

  constructor(
    commonType: string,
    name: string,
    httpCode: HttpStatusCode,
    description: string,
    isOperational: boolean
  ) {
    super(description);

    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain

    this.commonType = commonType;
    this.name = name;
    this.httpCode = httpCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this);
  }
}

const handleErrorResponse = async (res: Response, error: AppError) => {
  //crash if untrusted error

  let statusCode =
    error.message === "Unauthenticated"
      ? HttpStatusCode.UNAUTHORIZED
      : error.httpCode;
  let errorMessage = "";
  switch (statusCode) {
    case HttpStatusCode.UNAUTHORIZED:
      errorMessage = "Unauthorized!";
      break;
    case HttpStatusCode.BAD_REQUEST:
      errorMessage = "Bad request!";
      break;
  }

  return res.status(statusCode).json({ message: errorMessage });
};

class ErrorHandler {
  public async handleError(
    error: AppError,
    responseStream: Response
  ): Promise<void> {
    await handleErrorResponse(responseStream, error);
  }

  public isTrustedError(error: Error) {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }
}

export const errorHandler = new ErrorHandler();
