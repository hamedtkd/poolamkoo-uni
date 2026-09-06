"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RiCheckLine, RiLockPasswordLine, RiUser3Line } from "react-icons/ri";
import { PasswordInput } from "@/components/account/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DisplayNameForm({ initialName, onSaved }: { initialName: string | null; onSaved?: (name: string) => void }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") ?? "").trim();

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; user?: { displayName?: string | null } };
      if (!response.ok) throw new Error(body.error || "ویرایش نام انجام نشد.");
      const savedName = body.user?.displayName || displayName;
      setSuccess("نام نمایشی به‌روزرسانی شد.");
      onSaved?.(savedName);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ویرایش نام انجام نشد.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-2">
        <span className="flex items-center gap-2 type-label"><RiUser3Line /><span>نام نمایشی</span></span>
        <Input name="displayName" autoComplete="name" required minLength={2} maxLength={80} defaultValue={initialName ?? ""} placeholder="مثلاً حامد احمدی" />
      </label>
      <Status error={error} success={success} />
      <Button type="submit" disabled={pending}>{pending ? "در حال ذخیره…" : "ذخیره نام"}<RiCheckLine /></Button>
    </form>
  );
}

export function PasswordChangeForm({ onSaved }: { onSaved?: () => void }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setSuccess("");
    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      setError("تکرار رمز عبور جدید با رمز جدید یکسان نیست.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "تغییر رمز عبور انجام نشد.");
      setSuccess("رمز عبور با موفقیت تغییر کرد.");
      formElement.reset();
      onSaved?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تغییر رمز عبور انجام نشد.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PasswordField name="currentPassword" label="رمز عبور فعلی" autoComplete="current-password" />
      <PasswordField name="newPassword" label="رمز عبور جدید" autoComplete="new-password" />
      <PasswordField name="confirmPassword" label="تکرار رمز عبور جدید" autoComplete="new-password" />
      <Status error={error} success={success} />
      <Button type="submit" disabled={pending}>{pending ? "در حال تغییر…" : "تغییر رمز عبور"}<RiLockPasswordLine /></Button>
    </form>
  );
}

function PasswordField({ name, label, autoComplete }: { name: string; label: string; autoComplete: string }) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-2 type-label"><RiLockPasswordLine /><span>{label}</span></span>
      <PasswordInput name={name} dir="ltr" autoComplete={autoComplete} required minLength={8} maxLength={128} inputClassName="text-left" />
    </label>
  );
}

function Status({ error, success }: { error: string; success: string }) {
  if (error) return <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm leading-6 text-destructive">{error}</p>;
  if (success) return <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm leading-6 text-foreground">{success}</p>;
  return null;
}
