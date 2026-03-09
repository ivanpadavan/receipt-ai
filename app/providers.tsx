"use client";

import { initEffects } from "@ngneat/effects";
import { ReactNode, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { HawkInit } from "@/app/observability/HawkInit";
import { AuthProvider } from "@/context/AuthContext";
import type { User } from "@supabase/supabase-js";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { MyToaster } from "@/app/MyToaster";

export function Providers({ children, user }: { children: ReactNode, user: User }) {
  useEffect(() => {
    initEffects();
  }, []);

  return (
    <NuqsAdapter>
    <AuthProvider initialUser={user}>
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <HawkInit />
      <MyToaster />
      {children}
    </GoogleOAuthProvider>
    </AuthProvider>
    </NuqsAdapter>
  );
}
