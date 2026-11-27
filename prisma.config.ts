// Prisma ORM 7 config. Loads .env locally via Node's built-in loader (no dotenv
// dependency). In production the host injects env vars, so a missing .env is fine.
import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

if (existsSync(".env") && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
