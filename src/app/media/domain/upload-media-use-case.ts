import formidable from "formidable";
import { AppError } from "../../../lib/error-handling";
import { promises as fs } from "fs";
import { HttpStatusCode } from "../../../types/types";
import { v4 as uuid4 } from "uuid";
import { uploadMediaToS3 } from "./upload-media-service";

export const uploadMedia = async (
  file: formidable.File | undefined,
  surveyId: string
) => {
  if (!file)
    throw new AppError("BadRequest", "", HttpStatusCode.BAD_REQUEST, true);

  const filePath = file.filepath;
  let rawData = await fs.readFile(filePath);

  const fileName = uuid4() + "." + file.originalFilename?.split(".")[1];
  const key = `survey/${surveyId}/` + fileName;
  const contentType = file.mimetype ?? "binady/octet-stream";

  await uploadMediaToS3({ body: rawData, key, contentType });

  return `https://surveyco-survey-files.s3.eu-central-1.amazonaws.com/survey/${surveyId}/${fileName}`;
};
