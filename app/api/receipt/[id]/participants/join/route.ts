import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { serverSupabase } from "@/utils/supabase/server";
import { getNextColor } from "@/app/receipt/utils/participants";

const isAnonymousUser = (user: { is_anonymous?: boolean; identities?: { provider?: string }[] }) =>
  user.is_anonymous === true ||
  user.identities?.some((identity) => identity.provider === "anonymous") === true;

const getDisplayName = (rawMeta?: Record<string, unknown>) => {
  const displayName = typeof rawMeta?.displayName === "string" ? rawMeta.displayName : "";
  return displayName.trim();
};

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
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

  const displayName = getDisplayName(user.user_metadata as Record<string, unknown>);
  if (!displayName || displayName === "Anonymous") {
    return NextResponse.json({ error: "Display name required" }, { status: 400 });
  }

  if (isAnonymousUser(user)) {
    // allow anonymous join only after name set
  }

  const existing = await db.receiptUserParticipant.findFirst({
    where: { receiptId, userId: user.id },
  });
  if (existing) {
    return NextResponse.json({ participant: existing }, { status: 200 });
  }

  const [currentReal, currentMock] = await Promise.all([
    db.receiptUserParticipant.findMany({ where: { receiptId } }),
    db.receiptMockParticipant.findMany({ where: { receiptId } }),
  ]);

  const participant = await db.receiptUserParticipant.create({
    data: {
      receiptId,
      userId: user.id,
      color: getNextColor([...currentReal, ...currentMock]),
    },
  });

  return NextResponse.json({ participant }, { status: 200 });
}
