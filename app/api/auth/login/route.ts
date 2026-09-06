import { NextResponse } from "next/server";
import { AccountDatabaseError } from "@/lib/server/account-db";
import { AccountInputError, authenticateAccount, createAccountSession, LOCAL_SCOPE_COOKIE, scopeCookieOptions, SESSION_COOKIE, sessionCookieOptions } from "@/lib/server/auth";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  try {
    const user = await authenticateAccount(await request.json());
    const session = await createAccountSession(user.id);
    const response = NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
    response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
    response.cookies.set(LOCAL_SCOPE_COOKIE, user.id, scopeCookieOptions(session.expiresAt));
    return response;
  } catch (error) {
    if (error instanceof AccountInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof AccountDatabaseError) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ error: "ورود انجام نشد. دوباره تلاش کن." }, { status: 500 });
  }
}
