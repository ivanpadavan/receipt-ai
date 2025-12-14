"use client";

import { setupIonicReact } from "@ionic/react";
import { initEffects } from "@ngneat/effects";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { devTools } from '@ngneat/elf-devtools';
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children, session }: { children: ReactNode, session: Session | null }) {

  useEffect(() => {
    devTools();
    initEffects();
    setupIonicReact({ mode: 'ios' });
  }, []);

  return (<>
    <Toaster style={{ pointerEvents:'auto' }} position={'top-center'} richColors={true} visibleToasts={1} />
    <SessionProvider session={session}>{children}</SessionProvider>
  </>);
}
