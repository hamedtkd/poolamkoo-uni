import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAccount } from "@/lib/server/auth";

export default async function RegisterPage() {
  if (await getCurrentAccount()) redirect("/dashboard");
  return <Card><CardHeader><CardTitle>ساخت حساب کاربری</CardTitle><CardDescription>برای تفکیک کاربران یک حساب سروری می‌سازیم. درآمد، سرمایه‌گذاری و سایر داده‌های مالی در دیتابیس مرکزی ذخیره نمی‌شوند.</CardDescription></CardHeader><CardContent><AuthForm mode="register" /></CardContent></Card>;
}
