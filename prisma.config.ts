import path from 'node:path'
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
  experimental: {
    externalTables: true,
  },
  tables: {
    external: ["auth.users"],
  },
  migrations: {
    path: "prisma/migrations",
    // setup the users table for the shadow database
    initShadowDb: `
      CREATE TABLE auth.users (id SERIAL PRIMARY KEY);
    `,
  },
});
