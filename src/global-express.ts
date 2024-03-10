import { StrictAuthProp } from "@clerk/clerk-sdk-node";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request extends StrictAuthProp {}
  }
}
