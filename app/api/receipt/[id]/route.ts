import { db } from "@/app/db";
import { NextRequest, NextResponse } from "next/server";
import { isEqual } from "lodash-es";
import putValidator from "@/app/api-client/receipt/put";
import { errorWrap } from "@/app/api/receipt/error-wrap";
import { serverSupabase } from "@/utils/supabase/server";
import { getNextColor } from "@/app/receipt/utils/participants";

export const runtime = "nodejs";

const isAnonymousUser = (user: { is_anonymous?: boolean; identities?: { provider?: string }[] }) =>
  user.is_anonymous === true ||
  user.identities?.some((identity) => identity.provider === "anonymous") === true;

const stripParticipants = (data: unknown) => {
  if (!data || typeof data !== "object") return data;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { participants, ...rest } = data as Record<string, unknown>;
  return rest;
};

const getDisplayName = (rawMeta?: Record<string, unknown>) => {
  const displayName = typeof rawMeta?.displayName === "string" ? rawMeta.displayName : "";
  return displayName.trim() || "Anonymous";
};

const getAvatarUrl = (rawMeta?: Record<string, unknown>) => {
  const avatarUrl = typeof rawMeta?.avatarUrl === "string" ? rawMeta.avatarUrl : "";
  return avatarUrl.trim() || undefined;
};

const buildParticipants = async (receiptId: string) => {
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
    const rawMeta = (userById.get(p.userId)?.raw_user_meta_data || {}) as Record<
      string,
      unknown
    >;
    return {
      id: p.userId,
      displayName: getDisplayName(rawMeta),
      avatarUrl: getAvatarUrl(rawMeta),
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

const ensureRealParticipant = async (receiptId: string, user: { id: string; user_metadata?: Record<string, unknown>; is_anonymous?: boolean; identities?: { provider?: string }[] }) => {
  if (isAnonymousUser(user)) return;
  const displayName = getDisplayName(user.user_metadata as Record<string, unknown>);
  if (!displayName || displayName === "Anonymous") return;

  const existing = await db.receiptUserParticipant.findFirst({
    where: { receiptId, userId: user.id },
  });
  if (existing) return;

  const [currentReal, currentMock] = await Promise.all([
    db.receiptUserParticipant.findMany({ where: { receiptId } }),
    db.receiptMockParticipant.findMany({ where: { receiptId } }),
  ]);
  const color = getNextColor([...currentReal, ...currentMock]);
  await db.receiptUserParticipant.create({
    data: {
      receiptId,
      userId: user.id,
      color,
    },
  });
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: receiptId } = await params;

  // Verify receipt exists
  const receipt = await db.receipt.findUnique({
    where: { id: receiptId },
  });

  if (!receipt) {
    return new Response("Receipt not found", { status: 404 });
  }
  const initialReceipt = stripParticipants(receipt.data);
  let lastPayload = {
    receipt: initialReceipt,
    participants: await buildParticipants(receiptId),
  };

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // stream already closed
        }
      }, 20000);

      // Add this connection to the receipt's connection set
      const channelName = `topic:${receiptId}`;
      const supabase = await serverSupabase();
      const channel = supabase.channel(channelName);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await ensureRealParticipant(receiptId, user);
        lastPayload = {
          receipt: initialReceipt,
          participants: await buildParticipants(receiptId),
        };
      }

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(lastPayload)}\n\n`),
      );

      channel
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "Receipt",
            filter: `id=eq.${receiptId}`,
          },
          async (payload) => {
            const data = stripParticipants(payload?.new?.data);
            if (!data) return;
            const nextPayload = {
              receipt: data,
              participants: await buildParticipants(receiptId),
            };
            if (isEqual(nextPayload, lastPayload)) return;
            lastPayload = nextPayload;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(nextPayload)}\n\n`),
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "ReceiptUserParticipant",
            filter: `receiptId=eq.${receiptId}`,
          },
          async () => {
            const nextPayload = {
              receipt: lastPayload.receipt,
              participants: await buildParticipants(receiptId),
            };
            if (isEqual(nextPayload, lastPayload)) return;
            lastPayload = nextPayload;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(nextPayload)}\n\n`),
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "ReceiptMockParticipant",
            filter: `receiptId=eq.${receiptId}`,
          },
          async () => {
            const nextPayload = {
              receipt: lastPayload.receipt,
              participants: await buildParticipants(receiptId),
            };
            if (isEqual(nextPayload, lastPayload)) return;
            lastPayload = nextPayload;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(nextPayload)}\n\n`),
            );
          },
        )
        .subscribe();

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        try {
          clearInterval(heartbeat);
          controller.close();
          channel.unsubscribe();
        } catch {
          // Already closed
        }
      });

      await Promise.resolve();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

/**
 * FIXME ability to change only for users that visited
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return errorWrap(req, putValidator, async ({ body }) => {
    await db.receipt.update({
      where: { id },
      data: { data: body },
    });
    return NextResponse.json({ success: true }, { status: 200 });
  });
}
