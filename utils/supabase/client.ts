import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
);
