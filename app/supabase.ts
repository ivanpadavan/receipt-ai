import { createClient } from "@supabase/supabase-js";

// SupabaseClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForSupabase = global as unknown as { supabase: ReturnType<typeof createClient> };

export const supabase =
  globalForSupabase.supabase ||
  createClient(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.env.SUPABASE_URL!,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.env.SUPABASE_SECRET_KEY!,
  );

if (process.env.NODE_ENV !== "production") globalForSupabase.supabase = supabase;
