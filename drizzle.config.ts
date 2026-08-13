import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ??
      "postgresql://ikincikat:ikincikat@localhost:5432/ikincikat",
  },
  strict: true,
  verbose: true,
});
