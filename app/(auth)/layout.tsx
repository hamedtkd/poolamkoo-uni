import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-svh place-items-center p-4 sm:p-6">
    <div className="w-full max-w-md">
      <Link href="/" className="mx-auto mb-5 flex w-fit items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-accent"><BrandLogo className="size-9" /><span className="type-card-title">پولم‌کو</span></Link>
      {children}
    </div>
  </main>;
}
