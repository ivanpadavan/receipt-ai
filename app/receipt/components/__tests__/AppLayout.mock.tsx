import React from "react";
import { vi } from "vitest";
import { User } from "@supabase/supabase-js";
import { AppLayout } from "@/app/layout/AppLayout";
import { ParticipantsStoreProvider } from "@/app/receipt/store/participants";
import { ReceiptWithParticipants } from "@/model/receipt/model";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??= "public-anon-key";
});

const useUserMock = vi.fn();
export const pushMock = vi.fn();

interface AppLayoutMockProps {
  children: React.ReactNode;
  user: User;
  participants: ReceiptWithParticipants["participants"];
}

vi.mock("@/context/AuthContext", () => ({
  useUser: () => useUserMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  usePathname: () => "/receipt/receipt-1",
}));

vi.mock("@/app/providers", () => ({
  Providers: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  GoogleLogin: ({
    containerProps,
    type,
  }: {
    containerProps?: { className?: string };
    type?: string;
  }) => (
    <div
      className={containerProps?.className}
      data-google-login={type ?? "default"}
    />
  ),
  useGoogleOneTapLogin: () => undefined,
}));

export function AppLayoutMock({ children, user, participants }: AppLayoutMockProps) {
  useUserMock.mockReturnValue({ user });

  return (
    <AppLayout user={user}>
      <ParticipantsStoreProvider initialParticipants={participants}>
        {children}
      </ParticipantsStoreProvider>
    </AppLayout>
  );
}
