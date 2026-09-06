import { NextResponse } from "next/server";
import { AccountDatabaseError } from "@/lib/server/account-db";
import { AccountInputError, changeCurrentAccountPassword } from "@/lib/server/auth";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  try {
    await changeCurrentAccountPassword(await request.json());
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof AccountDatabaseError) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ error: "تغییر رمز عبور انجام نشد. دوباره تلاش کن." }, { status: 500 });
  }
}
