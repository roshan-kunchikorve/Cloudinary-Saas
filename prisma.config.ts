import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Neon tip: put the DIRECT (non-pooled) connection string in DIRECT_URL.
    // Migrations work best on a direct connection; the app itself uses DATABASE_URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
