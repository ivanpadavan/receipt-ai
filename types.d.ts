import "@supabase/supabase-js";
import "@supabase/auth-js";

declare module "@supabase/supabase-js" {
  interface UserMetadata {
    displayName: string;
    avatarUrl?: string;
  }
}


declare module "@supabase/auth-js" {
  interface UserMetadata {
    displayName: string;
    avatarUrl?: string;
  }
}

export {};
