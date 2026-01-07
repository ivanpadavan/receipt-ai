"use client";

import { initEffects } from "@ngneat/effects";
import { ReactNode, useEffect } from "react";
import { devTools } from '@ngneat/elf-devtools';
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {

  useEffect(() => {
    devTools();
    initEffects();
  }, []);

  return (<>
    <Toaster style={{ pointerEvents: 'auto' }} position={'top-center'} richColors={true} visibleToasts={1} />
    {children}
  </>);
}
