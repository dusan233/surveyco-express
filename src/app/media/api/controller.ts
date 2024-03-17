import formidable from "formidable";
import { Request, Response } from "express";
import { HttpStatusCode } from "../../../types/types";
import * as surveyUseCase from "../../../app/quizzes/domain/survey-use-case";
import { AppError } from "../../../lib/error-handling";
import { assertSurveyExists } from "../../../app/quizzes/domain/validators";
import { uploadMedia } from "../domain/upload-media-use-case";

const uploadMediaHandler = async (
  req: Request<never, undefined, never, { surveyId?: string }>,
  res: Response
) => {
  const surveyId = req.query.surveyId;

  if (!surveyId)
    throw new AppError("BadRequest", "", HttpStatusCode.BAD_REQUEST, true);

  const survey = await surveyUseCase.getSurvey(surveyId);
  assertSurveyExists(survey);

  const form = formidable({ maxFileSize: 10000000, maxFiles: 1 });
  const parsedResults = await form.parse(req);
  const files = parsedResults[1];

  const file = files.file?.[0];

  const fileUrl = await uploadMedia(file, surveyId);

  return res.status(HttpStatusCode.OK).json({
    success: true,
    fileUrl,
  });
};

export default {
  uploadMediaHandler,
};
