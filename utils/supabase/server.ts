import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function serverSupabase() {
    const cookieStore = await cookies()

    return createServerClient(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        process.env.SUPABASE_SECRET_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        },
    );
}

export async function getUser() {
    const supabase = await serverSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }
    return user;
}
