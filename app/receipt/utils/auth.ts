import { CredentialResponse } from "@react-oauth/google";
import { supabase } from "@/utils/supabase/client";

export const handleSignIn = async (response: CredentialResponse) => {
  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: response.credential }),
  });
  const { access_token, refresh_token } = await res.json();
  await supabase.auth.setSession({ access_token, refresh_token });
};

export const handleSignOut = async () => {
  await supabase.auth.signInAnonymously();
};