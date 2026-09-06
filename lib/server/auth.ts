import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  AccountDatabaseError,
  deleteSessionByTokenHash,
  findSessionByTokenHash,
  findUserByEmail,
  findUserRecordById,
  insertSession,
  insertUser,
  updateUserDisplayName,
  updateUserPasswordHash,
} from "@/lib/server/account-db";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import type { AccountUser, AccountUserRecord } from "@/lib/server/account-types";

export const SESSION_COOKIE = "poolamkoo_session";
export const LOCAL_SCOPE_COOKIE = "poolamkoo_scope";
const SESSION_DAYS = 30;

const accountInput = z.object({
  email: z.string().trim().email("ایمیل معتبر وارد کن.").max(254),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد.").max(128),
  displayName: z.string().trim().min(2, "نام نمایشی باید حداقل ۲ کاراکتر باشد.").max(80).optional(),
});
const profileInput = z.object({ displayName: z.string().trim().min(2, "نام نمایشی باید حداقل ۲ کاراکتر باشد.").max(80) });
const passwordInput = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8, "رمز عبور جدید باید حداقل ۸ کاراکتر باشد.").max(128),
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

function toPublicUser(user: AccountUserRecord): AccountUser {
  return { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt };
}

async function currentAccountRecord(): Promise<AccountUserRecord | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const hash = tokenHash(token);
  const session = await findSessionByTokenHash(hash);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await deleteSessionByTokenHash(hash).catch(() => undefined);
    return null;
  }
  return findUserRecordById(session.userId);
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

export async function updateCurrentAccountProfile(input: unknown) {
  const parsed = profileInput.safeParse(input);
  if (!parsed.success) throw new AccountInputError(parsed.error.issues[0]?.message ?? "نام نمایشی معتبر نیست.");
  const user = await currentAccountRecord();
  if (!user) throw new AccountInputError("نشست ورود معتبر نیست. دوباره وارد حساب شو.", 401);
  return updateUserDisplayName(user.id, parsed.data.displayName);
}

export async function changeCurrentAccountPassword(input: unknown) {
  const parsed = passwordInput.safeParse(input);
  if (!parsed.success) throw new AccountInputError(parsed.error.issues[0]?.message ?? "رمز عبور معتبر نیست.");
  const user = await currentAccountRecord();
  if (!user) throw new AccountInputError("نشست ورود معتبر نیست. دوباره وارد حساب شو.", 401);
  if (!await verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
    throw new AccountInputError("رمز عبور فعلی اشتباه است.", 401);
  }
  if (await verifyPassword(parsed.data.newPassword, user.passwordHash)) {
    throw new AccountInputError("رمز عبور جدید باید با رمز فعلی متفاوت باشد.");
  }
  return updateUserPasswordHash(user.id, await hashPassword(parsed.data.newPassword));
}

export async function createAccountSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await insertSession({ userId, tokenHash: tokenHash(token), expiresAt: expiresAt.toISOString() });
  return { token, expiresAt };
}

export async function getCurrentAccount(): Promise<AccountUser | null> {
  try {
    const user = await currentAccountRecord();
    return user ? toPublicUser(user) : null;
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
