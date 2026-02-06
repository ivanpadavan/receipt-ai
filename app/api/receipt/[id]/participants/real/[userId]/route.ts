import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { serverSupabase } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id: receiptId, userId } = await params;
  const supabase = await serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.receiptUserParticipant.findFirst({
    where: { receiptId, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.receiptUserParticipant.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true }, { status: 200 });
}
