import { db } from "@/app/db";
import { getNextColor } from "@/app/receipt/utils/participants";
import { Receipt } from "@/model/receipt/model";
import { User } from "@supabase/supabase-js";

type JoinReceiptServerOptions = {
  replaceParticipantId?: string;
};

const getDisplayName = (rawMeta: unknown): string | null => {
  if (!rawMeta || typeof rawMeta !== "object") return null;

  const name = (rawMeta as Record<string, unknown>).displayName;
  if (typeof name !== "string" || !name.trim()) return null;

  return name;
};

const replaceClaimParticipantId = (
  receipt: Receipt,
  sourceParticipantId: string,
  targetParticipantId: string,
): Receipt => ({
  ...receipt,
  positions: receipt.positions.map((position) => ({
    ...position,
    claims: position.claims.map((claim) => ({
      ...claim,
      participantIds: claim.participantIds.map((id) =>
        id === sourceParticipantId ? targetParticipantId : id,
      ),
    })),
  })),
});

async function replaceOfflineAnonymousParticipant(
  receiptId: string,
  user: User,
  replaceParticipantId: string,
) {
  return db.$transaction(async (tx) => {
    const participantToReplace = await tx.receiptUserParticipant.findUnique({
      where: {
        receiptId_userId: { receiptId, userId: replaceParticipantId },
      },
      include: {
        user: true,
        receipt: true,
      },
    });

    if (!participantToReplace || !participantToReplace.user.is_anonymous) {
      return null;
    }

    const previousDisplayName = getDisplayName(
      participantToReplace.user.raw_user_meta_data,
    );

    if (previousDisplayName) {
      await tx.users.update({
        where: { id: user.id },
        data: {
          raw_user_meta_data: {
            displayName: previousDisplayName,
          },
        },
      });
    }

    const receiptData = participantToReplace.receipt.data as Receipt;

    await tx.receiptUserParticipant.update({
      where: { id: participantToReplace.id },
      data: { userId: user.id },
    });

    await tx.receipt.update({
      where: { id: receiptId },
      data: {
        data: replaceClaimParticipantId(
          receiptData,
          replaceParticipantId,
          user.id,
        ),
      },
    });

    return tx.receiptUserParticipant.findUnique({
      where: { id: participantToReplace.id },
    });
  });
}

export async function joinReceiptServer(
  receiptId: string,
  user: User,
  options: JoinReceiptServerOptions = {},
) {
  const existing = await db.receiptUserParticipant.findFirst({
    where: { receiptId, userId: user.id },
  });
  if (existing) {
    return existing;
  }

  if (options.replaceParticipantId) {
    const replacedParticipant = await replaceOfflineAnonymousParticipant(
      receiptId,
      user,
      options.replaceParticipantId,
    );

    if (replacedParticipant) {
      return replacedParticipant;
    }
  }

  if (!user.user_metadata.displayName) {
    throw new Error("Display name required");
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
