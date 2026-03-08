"use client";

import { initEffects } from "@ngneat/effects";
import { ReactNode, useEffect } from "react";
import { devTools } from "@ngneat/elf-devtools";
import { Toaster } from "@/components/ui/sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { HawkInit } from "@/app/observability/HawkInit";
import { AuthProvider } from "@/context/AuthContext";
import { User } from "@supabase/supabase-js";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export function Providers({ children, user }: { children: ReactNode, user: User }) {
  useEffect(() => {
    devTools();
    initEffects();
  }, []);

  return (
    <NuqsAdapter>
    <AuthProvider initialUser={user}>
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <HawkInit />
      <Toaster
        style={{ pointerEvents: "auto" }}
        position={"top-center"}
        richColors={false}
        visibleToasts={1}
      />
      {children}
    </GoogleOAuthProvider>
    </AuthProvider>
    </NuqsAdapter>
  );
}
