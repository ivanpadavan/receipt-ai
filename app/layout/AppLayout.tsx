"use client";

import { ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { Providers } from "@/app/providers";
import { AppNavbar } from "@/app/layout/AppNavbar";
import { cn } from "@/utils/cn";
import { appShell } from "@/app/receipt/components/ui-styles";

export function AppLayout({
  children,
  user,
}: {
  children: ReactNode;
  user: User;
}) {
  return (
    <Providers user={user}>
      <div className={cn("min-h-[100dvh] flex flex-col", appShell)}>
        <AppNavbar />
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </Providers>
  );
}
