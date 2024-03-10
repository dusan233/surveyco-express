import config from "@/config";
import { s3Client } from "./s3-client";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export const uploadMediaToS3 = async (params: {
  key?: string;
  body?: Buffer;
  contentType?: string;
}) => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.get("aws.bucketname"),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
};
