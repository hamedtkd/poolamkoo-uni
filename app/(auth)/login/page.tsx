import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAccount } from "@/lib/server/auth";

export default async function LoginPage() {
  if (await getCurrentAccount()) redirect("/dashboard");
  return <Card><CardHeader><CardTitle>ورود به حساب</CardTitle><CardDescription>حساب روی سرور فقط هویت تو را نگه می‌دارد؛ اطلاعات مالی همچنان Local-first و روی همین دستگاه می‌ماند.</CardDescription></CardHeader><CardContent><AuthForm mode="login" /></CardContent></Card>;
}
