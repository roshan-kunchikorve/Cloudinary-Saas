import "dotenv/config"; // lets you keep TEST_DATABASE_URL in your .env file
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // lets tests use the same "@/..." imports as the app
    alias: { "@": import.meta.dirname },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", "lib/generated"],
  },
});
