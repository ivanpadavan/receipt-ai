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
    external: [
      "auth.audit_log_entries",
      "auth.flow_state",
      "auth.identities",
      "auth.instances",
      "auth.mfa_amr_claims",
      "auth.mfa_challenges",
      "auth.mfa_factors",
      "auth.oauth_authorizations",
      "auth.oauth_client_states",
      "auth.oauth_clients",
      "auth.oauth_consents",
      "auth.one_time_tokens",
      "auth.refresh_tokens",
      "auth.saml_providers",
      "auth.saml_relay_states",
      "auth.schema_migrations",
      "auth.sessions",
      "auth.sso_domains",
      "auth.sso_providers",
      "auth.users",
    ],
  },
  enums: {
    external: [
      "auth.aal_level",
      "auth.code_challenge_method",
      "auth.factor_status",
      "auth.factor_type",
      "auth.oauth_authorization_status",
      "auth.oauth_client_type",
      "auth.oauth_registration_type",
      "auth.oauth_response_type",
      "auth.one_time_token_type",
    ],
  },
  migrations: {
    path: "prisma/migrations",
    // setup the users table for the shadow database
    initShadowDb: `
      CREATE SCHEMA auth
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
    `,
  },
});
