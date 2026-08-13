import "dotenv/config";
import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const bucket = process.env.S3_BUCKET ?? "ikincikat-profile-photos";
const client = new S3Client({
  endpoint,
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "ikincikat",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "replace-me",
  },
});

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
} catch {
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
}

console.info(JSON.stringify({ level: "info", event: "object_storage_ready", bucket }));
