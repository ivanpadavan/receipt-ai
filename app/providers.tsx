"use client";

import { ModalProvider } from "@/components/ui/modal/ModalContext";
import { setupIonicReact } from "@ionic/react";
import { initEffects } from "@ngneat/effects";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { devTools } from '@ngneat/elf-devtools';

export function Providers({ children, session }: { children: ReactNode, session: Session | null }) {

  useEffect(() => {
    devTools();
    initEffects();
    setupIonicReact({ mode: 'ios' });
  }, []);

  return <ModalProvider>
    <SessionProvider session={session}>{children}</SessionProvider>
  </ModalProvider>;
}
