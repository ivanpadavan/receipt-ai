import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { serverSupabase } from "@/utils/supabase/server";
import { getNextColor } from "@/app/receipt/utils/participants";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: receiptId } = await params;
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
    return NextResponse.json({ error: "Display name required" }, { status: 400 });
  }

  const [currentReal, currentMock] = await Promise.all([
    db.receiptUserParticipant.findMany({ where: { receiptId } }),
    db.receiptMockParticipant.findMany({ where: { receiptId } }),
  ]);

  const participant = await db.receiptMockParticipant.create({
    data: {
      receiptId,
      displayName,
      color: getNextColor([...currentReal, ...currentMock]),
    },
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
