"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RiArrowLeftLine, RiLockPasswordLine, RiMailLine, RiUser3Line } from "react-icons/ri";
import { PasswordInput } from "@/components/account/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const register = mode === "register";
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      displayName: register ? String(form.get("displayName") ?? "") : undefined,
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };

    try {
      const response = await fetch(`/api/auth/${register ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "عملیات حساب کاربری انجام نشد.");
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "عملیات حساب کاربری انجام نشد.");
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="space-y-4">
    {register && <Field icon={<RiUser3Line />} label="نام نمایشی"><Input name="displayName" autoComplete="name" required minLength={2} maxLength={80} placeholder="مثلاً حامد احمدی" /></Field>}
    <Field icon={<RiMailLine />} label="ایمیل"><Input name="email" type="email" dir="ltr" autoComplete="email" required placeholder="you@example.com" className="text-left" /></Field>
    <Field icon={<RiLockPasswordLine />} label="رمز عبور"><PasswordInput name="password" dir="ltr" autoComplete={register ? "new-password" : "current-password"} required minLength={8} maxLength={128} inputClassName="text-left" /></Field>
    {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm leading-6 text-destructive">{error}</p>}
    <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "در حال انجام…" : register ? "ساخت حساب" : "ورود به پولم‌کو"}<RiArrowLeftLine /></Button>
    <p className="text-center text-sm text-muted-foreground">{register ? "قبلاً حساب ساخته‌ای؟" : "حساب نداری؟"} <Link className="text-primary hover:underline" href={register ? "/login" : "/register"}>{register ? "وارد شو" : "حساب بساز"}</Link></p>
  </form>;
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="flex items-center gap-2 type-label">{icon}<span>{label}</span></span>{children}</label>;
}
