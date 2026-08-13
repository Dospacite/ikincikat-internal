import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://ikincikat:ikincikat@localhost:5432/ikincikat"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32)
    .default("development-secret-change-me-123456789"),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  S3_ENDPOINT: z.url().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("ikincikat-profile-photos"),
  S3_ACCESS_KEY: z.string().default("ikincikat"),
  S3_SECRET_KEY: z.string().default("replace-me"),
  S3_FORCE_PATH_STYLE: z.string().default("true"),
  ADMIN_EMAIL: z.email().default("admin@local.ikincikat.com"),
  ADMIN_SEED_PASSWORD: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export const env = schema.parse(process.env);
