import { db } from "@/app/db";
import { NextRequest, NextResponse } from "next/server";
import { isEqual } from "lodash-es";
import putValidator from "@/app/api-client/receipt/put";
import { errorWrap } from "@/app/api/receipt/error-wrap";
import { getUser, serverSupabase } from "@/utils/supabase/server";
import { buildParticipants } from "@/app/db-utils/build-participants";
import type { ParticipantDTO } from "@/model/receipt/model";
import type {
  Receipt,
  ReceiptMockParticipant,
  ReceiptUserParticipant,
} from "@/prisma/generated/prisma/client";
import type {
  RealtimePostgresChangesPayload,
  RealtimePresenceState,
  RealtimePostgresUpdatePayload,
  REALTIME_SUBSCRIBE_STATES,
} from "@supabase/supabase-js";
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  fromEvent,
  map,
  takeUntil,
} from "rxjs";

export const runtime = "nodejs";

const withPresence = (
  payload: { receipt: unknown; participants: ParticipantDTO[] },
  onlineUserIds: Set<string>,
) => ({
  receipt: payload.receipt,
  participants: payload.participants.map((participant) =>
    participant.kind === "REAL"
      ? { ...participant, isOnline: onlineUserIds.has(participant.id) }
      : participant,
  ),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: receiptId } = await params;

  // Verify receipt exists
  const receipt = await db.receipt.findUnique({
    where: { id: receiptId },
  });

  if (!receipt) {
    return new Response("Receipt not found", { status: 404 });
  }
  const payload$ = new BehaviorSubject({
    receipt: receipt.data,
    participants: await buildParticipants(receiptId),
  });

  const supabase = await serverSupabase();

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
      const channel = supabase.channel(`topic:${receiptId}`);
      const currentUserId = (await getUser(supabase)).id;
      const onlineUserIds$ = new BehaviorSubject<Set<string>>(new Set());

      const syncPresenceState = () => {
        const state = channel.presenceState() as RealtimePresenceState<{
          userId?: string;
        }>;
        const nextOnlineUserIds = new Set<string>();

        for (const presences of Object.values(state)) {
          for (const presence of presences) {
            if (presence.userId) {
              nextOnlineUserIds.add(presence.userId);
            }
          }
        }

        onlineUserIds$.next(nextOnlineUserIds);
      };

      channel
        .on(
          "presence",
          { event: "sync" },
          syncPresenceState,
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "Receipt",
            filter: `id=eq.${receiptId}`,
          },
          async (payload: RealtimePostgresUpdatePayload<Receipt>) => {
            const data = payload.new.data;
            if (!data) return;
            payload$.next({
              receipt: data,
              participants: payload$.value.participants,
            });
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
          async (_payload: RealtimePostgresChangesPayload<ReceiptUserParticipant>) => {
            payload$.next({
              receipt: payload$.value.receipt,
              participants: await buildParticipants(receiptId),
            });
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
          async (_payload: RealtimePostgresChangesPayload<ReceiptMockParticipant>) => {
            payload$.next({
              receipt: payload$.value.receipt,
              participants: await buildParticipants(receiptId),
            });
          },
        )
        .subscribe((status: REALTIME_SUBSCRIBE_STATES) => {
          if (status !== "SUBSCRIBED") return;
          void channel.track({ userId: currentUserId });
        });

      combineLatest([payload$, onlineUserIds$])
        .pipe(
          map(([payload, onlineUserIds]) => withPresence(payload, onlineUserIds)),
          distinctUntilChanged(isEqual),
          takeUntil(fromEvent(req.signal, "abort")),
        )
        .subscribe({
          next: (payload) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          },
          complete: () => {
            try {
              void channel.untrack();
              clearInterval(heartbeat);
              controller.close();
              void channel.unsubscribe();
            } catch {
              // Already closed
            }
          },
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
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
