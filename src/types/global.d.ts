import { StrictAuthProp } from "@clerk/clerk-sdk-node";
import { Request } from "express";
import { Files } from "formidable";

declare global {
  namespace Express {
    interface Request extends StrictAuthProp {
      files?: Files;
    }
  }
}
