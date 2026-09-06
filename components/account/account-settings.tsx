"use client";

import { RiLockPasswordLine, RiUserSettingsLine } from "react-icons/ri";
import { DisplayNameForm, PasswordChangeForm } from "@/components/account/account-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AccountSettings({ displayName }: { displayName: string | null }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RiUserSettingsLine /> ویرایش پروفایل</CardTitle>
          <CardDescription>نامی که در منوی حساب و بخش‌های شخصی نمایش داده می‌شود.</CardDescription>
        </CardHeader>
        <CardContent><DisplayNameForm initialName={displayName} /></CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RiLockPasswordLine /> تغییر رمز عبور</CardTitle>
          <CardDescription>برای تغییر رمز، ابتدا رمز فعلی را وارد کن.</CardDescription>
        </CardHeader>
        <CardContent><PasswordChangeForm /></CardContent>
      </Card>
    </div>
  );
}
