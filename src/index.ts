import { AppError, errorHandler } from "./lib/error-handling";
import { startWebServer } from "./server";

startWebServer()
  .then((res) => {
    console.log("radi i server");
  })
  .catch((error) => {
    console.log("went wrong");
    // ️️️✅ Best Practice: A failure during startup is catastrophic and should lead to process exit (you may retry before)
    // Consequently, we flag the error as catastrophic
    errorHandler.handleError(
      new AppError("startup-failure", error.message, 500, false, error)
    );
  });
