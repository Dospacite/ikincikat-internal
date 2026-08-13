import "dotenv/config";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL tanımlı değil.");

const client = postgres(url, { max: 1, prepare: false });
const database = drizzle(client);

await migrate(database, { migrationsFolder: path.resolve("drizzle") });
await client.end();
console.info(
  JSON.stringify({ level: "info", event: "database_migrations_complete" }),
);
