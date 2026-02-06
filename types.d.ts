import "@supabase/supabase-js";

declare module "@supabase/supabase-js" {
  interface UserMetadata {
    name: string;
    avatar_url?: string;
  }
}

export {};
