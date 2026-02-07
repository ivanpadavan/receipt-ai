import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { serverSupabase } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> },
) {
  const { id: receiptId, participantId } = await params;
  const supabase = await serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const displayName =
    typeof body?.displayName === "string" ? body.displayName.trim() : "";
  if (!displayName) {
    return NextResponse.json(
      { error: "Display name required" },
      { status: 400 },
    );
  }

  const existing = await db.receiptMockParticipant.findUnique({
    where: { id: participantId },
  });
  if (!existing || existing.receiptId !== receiptId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const participant = await db.receiptMockParticipant.update({
    where: { id: participantId },
    data: { displayName },
  });

  return NextResponse.json(
    {
      participant: {
        id: participant.id,
        displayName: participant.displayName,
        color: participant.color,
        kind: "MOCK",
      },
    },
    { status: 200 },
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> },
) {
  const { id: receiptId, participantId } = await params;
  const supabase = await serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const participant = await db.receiptMockParticipant.findUnique({
    where: { id: participantId },
  });
  if (!participant || participant.receiptId !== receiptId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.receiptMockParticipant.delete({ where: { id: participantId } });
  return NextResponse.json({ success: true }, { status: 200 });
}
