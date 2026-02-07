"use client";

import { initEffects } from "@ngneat/effects";
import { ReactNode, useEffect } from "react";
import { devTools } from "@ngneat/elf-devtools";
import { Toaster } from "@/components/ui/sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    devTools();
    initEffects();
  }, []);

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <Toaster
        style={{ pointerEvents: "auto" }}
        position={"top-center"}
        richColors={false}
        visibleToasts={1}
      />
      {children}
    </GoogleOAuthProvider>
  );
}
