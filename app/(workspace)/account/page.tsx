import { redirect } from "next/navigation";
import { RiDatabase2Line, RiLock2Line, RiLogoutBoxRLine, RiUser3Line } from "react-icons/ri";
import { AccountSettings } from "@/components/account/account-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAccount } from "@/lib/server/auth";

export default async function AccountPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");

  return <div className="mx-auto max-w-4xl space-y-5">
    <header><div className="type-caption type-body-strong text-primary">حساب کاربری</div><h1 className="mt-1 type-page-title">هویت سروری، داده مالی محلی</h1><p className="mt-2 text-sm leading-7 text-muted-foreground">حساب فقط برای ورود و جداسازی کاربران است. رکوردهای مالی روی IndexedDB همین مرورگر باقی می‌مانند.</p></header>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><RiUser3Line /> مشخصات حساب</CardTitle><CardDescription>اطلاعاتی که در پایگاه داده سمت سرور نگهداری می‌شود.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><Info label="نام" value={account.displayName || "ثبت نشده"} /><Info label="ایمیل" value={account.email} ltr /></CardContent></Card>
    <AccountSettings displayName={account.displayName} />
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><RiDatabase2Line /> مرز ذخیره‌سازی</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-7 text-muted-foreground"><p className="flex gap-2"><RiLock2Line className="mt-1 size-5 shrink-0 text-primary" />سمت سرور: شناسه حساب، ایمیل، نام نمایشی، هش رمز عبور و نشست ورود.</p><p className="flex gap-2"><RiDatabase2Line className="mt-1 size-5 shrink-0 text-primary" />روی دستگاه: درآمدها، صندوق‌ها، تراکنش‌ها، سرمایه‌گذاری‌ها، برنامه‌ها و گزارش‌های مالی.</p></CardContent></Card>
    <form action="/api/auth/logout" method="post"><Button type="submit" variant="outline"><RiLogoutBoxRLine /> خروج از حساب</Button></form>
  </div>;
}

function Info({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="rounded-xl border bg-muted/25 p-3"><div className="type-caption text-muted-foreground">{label}</div><div dir={ltr ? "ltr" : undefined} className="mt-1 type-label break-all">{value}</div></div>;
}
