import { serverSupabase } from "@/utils/supabase/server";
import { db } from "@/app/db";
import { getNextColor } from "@/app/receipt/utils/participants";
import { User } from "@supabase/supabase-js";

export async function joinToReceiptSsr(receiptId: string, user: User) {
  const supabase = await serverSupabase();

  if (!user.user_metadata.displayName) {
    throw new Error('Display name required');
  }

  const existing = await db.receiptUserParticipant.findFirst({
    where: { receiptId, userId: user.id },
  });
  if (existing) {
    return existing;
  }

  const [currentReal, currentMock] = await Promise.all([
    db.receiptUserParticipant.findMany({ where: { receiptId } }),
    db.receiptMockParticipant.findMany({ where: { receiptId } }),
  ]);

  return db.receiptUserParticipant.create({
    data: {
      receiptId,
      userId: user.id,
      color: getNextColor([...currentReal, ...currentMock]),
    },
  });
}