"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RiArrowLeftSLine, RiBookOpenLine, RiGithubFill, RiLogoutBoxRLine, RiLockPasswordLine, RiStarFill, RiUserSettingsLine } from "react-icons/ri";
import { DisplayNameForm, PasswordChangeForm } from "@/components/account/account-forms";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AccountUser } from "@/lib/server/account-types";
import { useGithubStats } from "@/hooks/use-github-stats";
import { COMMUNITY_LINKS } from "@/lib/community";
import { cn } from "@/lib/utils";

export function SidebarAccountMenu({ account, collapsed }: { account: AccountUser; collapsed: boolean }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [displayName, setDisplayName] = useState(account.displayName);
  const stats = useGithubStats();

  const name = displayName?.trim() || "کاربر پولم‌کو";
  const initials = useMemo(() => accountInitials(name, account.email), [name, account.email]);

  const trigger = (
    <button
      type="button"
      aria-label="باز کردن منوی حساب کاربری"
      className={cn(
        "flex w-full items-center rounded-2xl border bg-muted/30 text-start transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        collapsed ? "size-11 justify-center p-0" : "gap-3 px-2.5 py-2",
      )}
    >
      <Avatar initials={initials} />
      {!collapsed && <><span className="min-w-0 flex-1"><span className="block truncate type-label">{name}</span><span dir="ltr" className="block truncate text-left type-caption text-muted-foreground">{account.email}</span></span><RiArrowLeftSLine className="size-4 shrink-0 text-muted-foreground" /></>}
    </button>
  );

  return (
    <>
      <div className={cn("border-t", collapsed ? "px-2 py-3" : "p-3")}>
        {collapsed && <CompactGuide />}
        <Popover open={profileOpen} onOpenChange={setProfileOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent side="left" align="end" sideOffset={10} className="w-[290px] p-2">
            <div className="flex items-center gap-3 rounded-xl bg-muted/35 p-3">
              <Avatar initials={initials} large />
              <div className="min-w-0"><div className="truncate type-label">{name}</div><div dir="ltr" className="truncate text-left type-caption text-muted-foreground">{account.email}</div></div>
            </div>

            <div className="mt-2 grid gap-1">
              <MenuLink href="/account" label="مدیریت حساب" icon={<RiUserSettingsLine />} onClick={() => setProfileOpen(false)} />
              <MenuButton label="ویرایش نام نمایشی" icon={<RiUserSettingsLine />} onClick={() => { setProfileOpen(false); setNameDialogOpen(true); }} />
              <MenuButton label="تغییر رمز عبور" icon={<RiLockPasswordLine />} onClick={() => { setProfileOpen(false); setPasswordDialogOpen(true); }} />
              <a href={COMMUNITY_LINKS.repository} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 type-label transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><RiGithubFill className="size-5 text-muted-foreground" /><span className="flex-1">پروژه در GitHub</span>{stats.stars !== null && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><RiStarFill className="size-3.5" />{new Intl.NumberFormat("fa-IR").format(stats.stars)}</span>}</a>
            </div>

            <div className="my-2 border-t" />
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start type-label text-destructive transition hover:bg-destructive/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><RiLogoutBoxRLine className="size-5" /><span>خروج از حساب</span></button>
            </form>
          </PopoverContent>
        </Popover>
        {!collapsed && <div className="mt-1 flex items-center justify-center"><Link href="/guide" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"><RiBookOpenLine /> راهنما</Link></div>}
      </div>

      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>ویرایش نام نمایشی</DialogTitle><DialogDescription>این نام فقط برای نمایش در حساب کاربری استفاده می‌شود و اطلاعات مالی را تغییر نمی‌دهد.</DialogDescription></DialogHeader>
          <DisplayNameForm initialName={displayName} onSaved={(value) => { setDisplayName(value); window.setTimeout(() => setNameDialogOpen(false), 450); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تغییر رمز عبور</DialogTitle><DialogDescription>برای امنیت حساب، رمز فعلی را هم وارد کن.</DialogDescription></DialogHeader>
          <PasswordChangeForm onSaved={() => window.setTimeout(() => setPasswordDialogOpen(false), 450)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Avatar({ initials, large = false }: { initials: string; large?: boolean }) {
  return <span aria-hidden="true" className={cn("grid shrink-0 place-items-center rounded-full bg-primary/15 font-bold text-primary ring-1 ring-primary/25", large ? "size-11 text-sm" : "size-9 text-xs")}>{initials}</span>;
}

function MenuButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start type-label transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="text-muted-foreground [&_svg]:size-5">{icon}</span><span>{label}</span></button>;
}

function MenuLink({ href, label, icon, onClick }: { href: string; label: string; icon: React.ReactNode; onClick: () => void }) {
  return <Link href={href} onClick={onClick} className="flex items-center gap-3 rounded-xl px-3 py-2.5 type-label transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="text-muted-foreground [&_svg]:size-5">{icon}</span><span>{label}</span></Link>;
}

function CompactGuide() {
  return <Tooltip><TooltipTrigger asChild><Link href="/guide" aria-label="راهنما" className="mb-1 grid size-11 place-items-center rounded-xl text-muted-foreground transition hover:bg-accent hover:text-foreground"><RiBookOpenLine className="size-5" /></Link></TooltipTrigger><TooltipContent side="left">راهنما</TooltipContent></Tooltip>;
}

function accountInitials(displayName: string, email: string) {
  const words = displayName.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  if (words[0]?.[0]) return words[0][0].toUpperCase();
  return email[0]?.toUpperCase() || "P";
}
