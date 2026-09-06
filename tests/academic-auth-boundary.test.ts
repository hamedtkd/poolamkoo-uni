import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("academic server database stores identity and sessions only", () => {
  const sql = read("supabase/academic-auth.sql");
  assert.match(sql, /create table if not exists public\.app_users/);
  assert.match(sql, /create table if not exists public\.app_sessions/);
  assert.doesNotMatch(sql, /create table[^;]*(income|transaction|fund|asset|portfolio)/i);
});

test("workspace requires a server account", () => {
  const layout = read("app/(workspace)/layout.tsx");
  assert.match(layout, /getCurrentAccount/);
  assert.match(layout, /redirect\("\/login"\)/);
});

test("financial IndexedDB is isolated by account scope", () => {
  const db = read("lib/db.ts");
  const scope = read("lib/local-database-scope.ts");
  assert.match(db, /resolveLocalDatabaseName\(\)/);
  assert.match(scope, /poolamkoo_scope/);
  assert.equal(scope.includes("`${LEGACY_DATABASE_NAME}-${scope.replace"), true);
});

test("Supabase server secret remains server-only", () => {
  const serverDb = read("lib/server/account-db.ts");
  const env = read(".env.example");
  assert.match(serverDb, /SUPABASE_SECRET_KEY/);
  assert.match(serverDb, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(env, /NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(env, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
});

test("new Supabase secret keys are sent as API keys, not fake bearer JWTs", () => {
  const serverDb = read("lib/server/account-db.ts");
  assert.match(serverDb, /headers\.set\("apikey", secretKey\)/);
  assert.match(serverDb, /if \(isLegacyJwtKey\(secretKey\)\)/);
});

test("academic tables explicitly grant only the server Data API role", () => {
  const sql = read("supabase/academic-auth.sql");
  assert.match(sql, /grant select, insert, update, delete on table public\.app_users to service_role/i);
  assert.match(sql, /grant select, insert, update, delete on table public\.app_sessions to service_role/i);
  assert.match(sql, /revoke all on table public\.app_users from anon, authenticated/i);
  assert.match(sql, /revoke all on table public\.app_sessions from anon, authenticated/i);
});
