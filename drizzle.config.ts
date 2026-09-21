import fs from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";

if (fs.existsSync(".env.local")) loadEnvFile(".env.local");
else if (fs.existsSync(".env")) loadEnvFile(".env");

export default defineConfig({
  schema: "./src/server/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL || "" },
});
