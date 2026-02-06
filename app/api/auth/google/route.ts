import { NextResponse } from "next/server";
import { serverSupabase } from "@/utils/supabase/server";
import { User } from "@supabase/supabase-js";
import { db } from "@/app/db";

const getUserMetadata = (user: User): User["user_metadata"] => {
  const identity = user?.identities?.find((i) => i.provider !== "anonymous");
  const identityData = (identity?.identity_data || {}) as Record<
    string,
    unknown
  >;
  const displayName =
    (user.user_metadata?.displayName as string | undefined) ||
    (identityData.full_name as string | undefined) ||
    (identityData.name as string | undefined) ||
    user.email ||
    "Mystery";
  const avatarUrl =
    (user.user_metadata?.avatarUrl as string | undefined) ||
    (identityData.avatar_url as string | undefined) ||
    (identityData.picture as string | undefined) ||
    undefined;

  return { displayName, avatarUrl };
};

export async function POST(request: Request) {
  // 1. Получаем ID Token от Google с клиента
  const body = await request.json().catch(() => ({}));
  const token = body.token;

  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 400 });
  }

  const supabase = await serverSupabase();

  const { data: linkData, error: linkError } = await supabase.auth.linkIdentity({
    provider: "google",
    token: token,
  });

  if (!linkError && linkData.session && linkData.user) {
    // Достаем основные поля и кладем в новый аккаунт
    await supabase.auth.updateUser({
      data: getUserMetadata(linkData.user)
    });
    // УСПЕХ: Аккаунт привязан.
    // Возвращаем успех, но сессию менять не надо (она та же)
    return NextResponse.json({
      access_token: linkData.session.access_token,
      refresh_token: linkData.session.refresh_token,
    });
  }

  // === СЦЕНАРИЙ 2: ВХОД (Login) ===
  // (Выполняется, если юзер не залогинен ИЛИ если линк не удался из-за занятости)

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithIdToken({
      provider: "google",
      token: token,
    });

  if (signInError) {
    console.error("[Auth] Sign-in error:", signInError);
    return NextResponse.json({ error: signInError.message }, { status: 400 });
  }

  if (!signInData.session) {
    return NextResponse.json({ error: "No session created" }, { status: 500 });
  }

  // УСПЕХ: Вход выполнен.
  // Возвращаем сессию клиенту, чтобы он мог обновить состояние UI (setSession)
  // Куки HttpOnly уже установлены автоматически методом createServerClient -> cookies.set
  return NextResponse.json({
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
  });
}
