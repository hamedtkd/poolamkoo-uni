import type { AccountSessionRecord, AccountUser, AccountUserRecord } from "@/lib/server/account-types";

type DbUserRow = {
  id: string;
  email: string;
  display_name: string | null;
  password_hash: string;
  created_at: string;
};

type DbSessionRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
};

export class AccountDatabaseError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "AccountDatabaseError";
  }
}

function config() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  // Prefer Supabase's current server-only secret key. Keep the legacy
  // service_role JWT as a temporary compatibility fallback.
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !secretKey) {
    throw new AccountDatabaseError("پایگاه داده حساب‌های کاربری هنوز تنظیم نشده است.");
  }
  return { baseUrl, secretKey };
}

export function isAccountDatabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL
      && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
  );
}

function isLegacyJwtKey(key: string) {
  return key.split(".").length === 3;
}

async function requestRows<T>(path: string, init?: RequestInit) {
  const { baseUrl, secretKey } = config();
  const headers = new Headers(init?.headers);
  headers.set("apikey", secretKey);
  // New sb_secret_* keys are opaque API keys, not JWTs. Only legacy
  // service_role JWTs belong in the Authorization Bearer header.
  if (isLegacyJwtKey(secretKey)) {
    headers.set("Authorization", `Bearer ${secretKey}`);
  }
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new AccountDatabaseError(detail || `Account database request failed (${response.status})`, response.status);
  }

  if (response.status === 204) return [] as T[];
  const body = await response.text();
  return body ? JSON.parse(body) as T[] : [] as T[];
}

function mapUser(row: DbUserRow): AccountUserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

function mapSession(row: DbSessionRow): AccountSessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export async function findUserByEmail(email: string) {
  const query = new URLSearchParams({ email: `eq.${email}`, select: "id,email,display_name,password_hash,created_at", limit: "1" });
  const rows = await requestRows<DbUserRow>(`app_users?${query}`);
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserById(id: string): Promise<AccountUser | null> {
  const query = new URLSearchParams({ id: `eq.${id}`, select: "id,email,display_name,password_hash,created_at", limit: "1" });
  const rows = await requestRows<DbUserRow>(`app_users?${query}`);
  const row = rows[0];
  return row ? mapUser(row) : null;
}

export async function insertUser(input: { email: string; displayName: string | null; passwordHash: string }) {
  const rows = await requestRows<DbUserRow>("app_users", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ email: input.email, display_name: input.displayName, password_hash: input.passwordHash }),
  });
  if (!rows[0]) throw new AccountDatabaseError("ساخت حساب کاربری کامل نشد.");
  return mapUser(rows[0]);
}

export async function insertSession(input: { userId: string; tokenHash: string; expiresAt: string }) {
  const rows = await requestRows<DbSessionRow>("app_sessions", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ user_id: input.userId, token_hash: input.tokenHash, expires_at: input.expiresAt }),
  });
  if (!rows[0]) throw new AccountDatabaseError("ساخت نشست کاربری کامل نشد.");
  return mapSession(rows[0]);
}

export async function findSessionByTokenHash(tokenHash: string) {
  const query = new URLSearchParams({ token_hash: `eq.${tokenHash}`, select: "id,user_id,token_hash,expires_at,created_at", limit: "1" });
  const rows = await requestRows<DbSessionRow>(`app_sessions?${query}`);
  return rows[0] ? mapSession(rows[0]) : null;
}

export async function deleteSessionByTokenHash(tokenHash: string) {
  const query = new URLSearchParams({ token_hash: `eq.${tokenHash}` });
  await requestRows<never>(`app_sessions?${query}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
