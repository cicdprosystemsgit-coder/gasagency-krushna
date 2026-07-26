import dotenv from "dotenv";
import { defineConfig } from "prisma/config";
import path from "path";
import fs from "fs";

// Load .env.production if it exists, otherwise fallback to .env
const envPath = fs.existsSync(path.resolve(process.cwd(), ".env.production"))
  ? ".env.production"
  : ".env";

dotenv.config({ path: envPath });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
