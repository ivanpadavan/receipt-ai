import { NextResponse } from "next/server";
import { serverSupabase } from "@/utils/supabase/server";
import { db } from "@/app/db";
import { User } from "@supabase/supabase-js";

const getUserMetadata = (user: User): User['user_metadata'] => {
  const identity = user?.identities?.find((i) => i.provider !== "anonymous");
  const identityData = (identity?.identity_data || {}) as Record<
    string,
    unknown
  >;
  const displayName =
    (user.user_metadata?.name as string | undefined) ||
    (identityData.full_name as string | undefined) ||
    (identityData.name as string | undefined) ||
    user.email ||
    "Mystery";
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ||
    (identityData.avatar_url as string | undefined) ||
    (identityData.picture as string | undefined) ||
    undefined;

  return { displayName, avatarUrl };
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const nextUrl = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await serverSupabase();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      await db.users.update({
        where: { id: data.user.id },
        data: {
          raw_user_meta_data: getUserMetadata(data.user)
        }
      })
      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${nextUrl}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${nextUrl}`);
      } else {
        return NextResponse.redirect(`${origin}${nextUrl}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
