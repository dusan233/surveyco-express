import { StrictAuthProp } from "@clerk/clerk-sdk-node";
import { Request } from "express";

declare global {
  namespace Express {
    interface Request extends StrictAuthProp {}
  }
}
