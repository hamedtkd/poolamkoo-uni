import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { AccountDatabaseError, deleteSessionByTokenHash, findSessionByTokenHash, findUserByEmail, findUserById, insertSession, insertUser } from "@/lib/server/account-db";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import type { AccountUser } from "@/lib/server/account-types";

export const SESSION_COOKIE = "poolamkoo_session";
export const LOCAL_SCOPE_COOKIE = "poolamkoo_scope";
const SESSION_DAYS = 30;

const accountInput = z.object({
  email: z.string().trim().email("ایمیل معتبر وارد کن.").max(254),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد.").max(128),
  displayName: z.string().trim().min(2).max(80).optional(),
});

export class AccountInputError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "AccountInputError";
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function registerAccount(input: unknown) {
  const parsed = accountInput.safeParse(input);
  if (!parsed.success) throw new AccountInputError(parsed.error.issues[0]?.message ?? "اطلاعات حساب معتبر نیست.");

  const email = normalizeEmail(parsed.data.email);
  if (await findUserByEmail(email)) throw new AccountInputError("برای این ایمیل قبلاً حساب ساخته شده است.", 409);

  try {
    return await insertUser({
      email,
      displayName: parsed.data.displayName?.trim() || null,
      passwordHash: await hashPassword(parsed.data.password),
    });
  } catch (error) {
    if (error instanceof AccountDatabaseError && error.status === 409) {
      throw new AccountInputError("برای این ایمیل قبلاً حساب ساخته شده است.", 409);
    }
    throw error;
  }
}

export async function authenticateAccount(input: unknown) {
  const parsed = accountInput.pick({ email: true, password: true }).safeParse(input);
  if (!parsed.success) throw new AccountInputError(parsed.error.issues[0]?.message ?? "ایمیل یا رمز عبور معتبر نیست.");

  const user = await findUserByEmail(normalizeEmail(parsed.data.email));
  if (!user || !await verifyPassword(parsed.data.password, user.passwordHash)) {
    throw new AccountInputError("ایمیل یا رمز عبور اشتباه است.", 401);
  }
  return user;
}

export async function createAccountSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await insertSession({ userId, tokenHash: tokenHash(token), expiresAt: expiresAt.toISOString() });
  return { token, expiresAt };
}

export async function getCurrentAccount(): Promise<AccountUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const hash = tokenHash(token);
    const session = await findSessionByTokenHash(hash);
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await deleteSessionByTokenHash(hash).catch(() => undefined);
      return null;
    }
    return await findUserById(session.userId);
  } catch {
    return null;
  }
}

export async function revokeCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return;
  await deleteSessionByTokenHash(tokenHash(token)).catch(() => undefined);
}

export function sessionCookieOptions(expiresAt: Date) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt };
}

export function scopeCookieOptions(expiresAt: Date) {
  return { httpOnly: false, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt };
}
