import { NextResponse } from "next/server";
import { LOCAL_SCOPE_COOKIE, revokeCurrentSession, SESSION_COOKIE } from "@/lib/server/auth";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  await revokeCurrentSession();
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(LOCAL_SCOPE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
