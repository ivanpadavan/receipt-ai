import { NextRequest, NextResponse } from "next/server";
import { getUser, serverSupabase } from "@/utils/supabase/server";
import { joinReceiptServer } from "@/app/receipt/[id]/join-flow/join-receipt-server";
import { updateUserProfileServer } from "@/app/settings/update-user-profile-server";

export const runtime = "nodejs";

type JoinPayload = {
  replaceParticipantId?: string;
  profile?: {
    displayName: string;
    avatarUrl?: string;
    avatarFile?: File;
  };
};

async function getJoinPayload(req: NextRequest): Promise<JoinPayload> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const rawProfile = formData.get("profile");
    const profile = typeof rawProfile === "string" ? JSON.parse(rawProfile) : undefined;
    const avatarFile = formData.get("avatarFile");

    return {
      profile: profile
        ? {
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            avatarFile: avatarFile instanceof File ? avatarFile : undefined,
          }
        : undefined,
      replaceParticipantId:
        typeof formData.get("replaceParticipantId") === "string"
          ? String(formData.get("replaceParticipantId"))
          : undefined,
    };
  }

  const rawBody = await req.text();
  if (!rawBody) return {};

  const body = JSON.parse(rawBody);
  return {
    replaceParticipantId:
      typeof body.replaceParticipantId === "string"
        ? body.replaceParticipantId
        : undefined,
    profile:
      body.profile &&
      typeof body.profile.displayName === "string"
        ? {
            displayName: body.profile.displayName,
            avatarUrl:
              typeof body.profile.avatarUrl === "string"
                ? body.profile.avatarUrl
                : undefined,
          }
        : undefined,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: receiptId } = await params;
  const supabase = await serverSupabase();
  const user = await getUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await getJoinPayload(req);

    if (payload.replaceParticipantId && payload.profile) {
      return NextResponse.json(
        { error: "Ambiguous payload" },
        { status: 400 },
      );
    }

    let nextUser = user;
    if (payload.profile) {
      await updateUserProfileServer({
        supabase,
        user,
        displayName: payload.profile.displayName,
        avatarUrl: payload.profile.avatarUrl,
        avatarFile: payload.profile.avatarFile,
      });
      nextUser = await getUser(supabase);
    }

    return NextResponse.json(
      {
        participant: await joinReceiptServer(receiptId, nextUser, {
          replaceParticipantId: payload.replaceParticipantId,
        }),
      },
      { status: 200 },
    );
  } catch (e) {
    if (!(e instanceof Error)) {
      return NextResponse.json({ error: 'Fail' }, { status: 500 });
    }
    return NextResponse.json(
      { error: e.message },
      { status: 400 },
    );
  }
}
