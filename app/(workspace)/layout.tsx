import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppRouteLayout } from "@/components/app/app-route-layout";
import { PwaUpdateNotice } from "@/components/system/pwa-update-notice";
import { getCurrentAccount } from "@/lib/server/auth";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  manifest: "/app.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: SITE_NAME },
  robots: { index: false, follow: false },
};

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");
  return <><AppRouteLayout account={account}>{children}</AppRouteLayout><PwaUpdateNotice /></>;
}
