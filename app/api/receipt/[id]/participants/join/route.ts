import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/supabase/server";
import { joinReceiptServer } from "@/app/receipt/[id]/join-flow/join-receipt-server";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: receiptId } = await params;
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawBody = await req.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const replaceParticipantId =
      typeof body.replaceParticipantId === "string"
        ? body.replaceParticipantId
        : undefined;

    return NextResponse.json(
      {
        participant: await joinReceiptServer(receiptId, user, {
          replaceParticipantId,
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
