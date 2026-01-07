import { createBrowserClient } from '@supabase/ssr'

const globalForSupabase = global as unknown as {
  supabase: ReturnType<typeof createBrowserClient>;
};

export const supabase =
  globalForSupabase.supabase ||
  createBrowserClient(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
  );

if (process.env.NODE_ENV !== "production")
  globalForSupabase.supabase = supabase;
