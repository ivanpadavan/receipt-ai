import { db } from "@/app/db";
import type { UserMetadata } from "@supabase/supabase-js";

export const buildParticipants = async (receiptId: string) => {
  const [realParticipants, mockParticipants] = await Promise.all([
    db.receiptUserParticipant.findMany({
      where: { receiptId },
      orderBy: { createdAt: "asc" },
    }),
    db.receiptMockParticipant.findMany({
      where: { receiptId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const userIds = realParticipants.map((p) => p.userId);
  const users = userIds.length
    ? await db.users.findMany({ where: { id: { in: userIds } } })
    : [];

  const userById = new Map(users.map((u) => [u.id, u]));

  const realDtos = realParticipants.map((p) => {
    const rawMeta = (userById.get(p.userId)?.raw_user_meta_data ||
      {}) as UserMetadata;
    return {
      id: p.userId,
      displayName: rawMeta.displayName,
      avatarUrl: rawMeta.avatarUrl,
      color: p.color,
      kind: "REAL" as const,
    };
  });

  const mockDtos = mockParticipants.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    color: p.color,
    kind: "MOCK" as const,
  }));

  return [...realDtos, ...mockDtos];
};
