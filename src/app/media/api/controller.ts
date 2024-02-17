import formidable from "formidable";
import { Request, Response } from "express";
import { HttpStatusCode } from "../../../types/types";
import { s3Client } from "../../../s3-client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { promises as fs } from "fs";
import { AppError } from "../../../lib/errors";
import { v4 as uuid4 } from "uuid";
import config from "../../../config";

const uploadMediaHandler = async (
  req: Request<any, any, any, { surveyId?: string }>,
  res: Response
) => {
  const form = formidable({ maxFileSize: 10000000, maxFiles: 1 });
  const surveyId = req.query.surveyId;

  if (!surveyId) {
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);
  }

  const [_, files] = await form.parse(req);

  const file = files.file?.[0];

  if (!file)
    throw new AppError("", "Not found", HttpStatusCode.BAD_REQUEST, "", true);

  const filePath = file.filepath;
  let rawData = await fs.readFile(filePath);

  const fileName = uuid4() + "." + file.originalFilename?.split(".")[1];
  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.get("aws.bucketname"),
      Key: `survey/${surveyId}/` + fileName,
      Body: rawData,
      ContentType: file.mimetype ?? "binady/octet-stream",
    })
  );

  return res.status(HttpStatusCode.OK).json({
    success: true,
    fileUrl: `https://surveyco-survey-files.s3.eu-central-1.amazonaws.com/survey/${surveyId}/${fileName}`,
  });
};

export default {
  uploadMediaHandler,
};
