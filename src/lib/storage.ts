import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "@/lib/env";

export const storage = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
});

export async function storageReady() {
  await storage.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
}

export async function putProfilePhoto(key: string, body: Uint8Array) {
  await storage.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "private, max-age=86400",
    }),
  );
}

export async function getProfilePhoto(key: string) {
  return storage.send(
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
  );
}

export async function deleteProfilePhoto(key: string) {
  await storage.send(
    new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
  );
}
