import "@supabase/supabase-js";
import "@supabase/auth-js";

declare module "@supabase/supabase-js" {
  interface UserMetadata {
    displayName: string;
    avatar_url?: string;
  }
}


declare module "@supabase/auth-js" {
  interface UserMetadata {
    displayName: string;
    avatar_url?: string;
  }
}

export {};
