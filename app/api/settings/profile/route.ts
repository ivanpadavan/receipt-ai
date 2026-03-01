import { NextRequest, NextResponse } from "next/server";
import { getUser, serverSupabase } from "@/utils/supabase/server";
import { updateUserProfileServer } from "@/app/settings/update-user-profile-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await serverSupabase();

  try {
    const user = await getUser(supabase);
    const formData = await req.formData();

    const displayName = String(formData.get("displayName") || "");
    const avatarUrl = formData.get("avatarUrl");
    const avatarFile = formData.get("avatarFile");

    const result = await updateUserProfileServer({
      supabase,
      user,
      displayName,
      avatarUrl: typeof avatarUrl === "string" ? avatarUrl : undefined,
      avatarFile: avatarFile instanceof File ? avatarFile : undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "no user") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 400 },
    );
  }
}

