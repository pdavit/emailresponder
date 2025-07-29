import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: "ep-spring-flower-aekt2i7p-pooler.c-2.us-east-2.aws.neon.tech",
    database: "neondb",
    user: "neondb_owner",
    password: "npg_XyA4qd9slewa",
    ssl: true
  },
});
