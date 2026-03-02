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
  users,
} from "@/prisma/generated/prisma/client";
import type {
  REALTIME_SUBSCRIBE_STATES,
  RealtimePostgresChangesPayload,
  RealtimePostgresUpdatePayload,
  RealtimePresenceState,
} from "@supabase/supabase-js";
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  fromEvent,
  ignoreElements,
  map, merge,
  Observable,
  switchMap,
  takeUntil,
} from "rxjs";

export const runtime = "nodejs";

interface PresenceTrackChannel {
  track: (payload: { userId: string }) => Promise<unknown>;
}

export async function trackPresenceAndSync(
  channel: PresenceTrackChannel,
  userId: string,
  syncPresenceState: () => void,
) {
  await channel.track({ userId });
  syncPresenceState();
}

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
      const channelName = `topic:${receiptId}`;
      const channel = supabase.channel(channelName);
      const currentUserId = (await getUser(supabase)).id;
      const onlineUserIds$ = new BehaviorSubject<Set<string>>(new Set());
      let syncSeq = 0;

      const syncPayloadFromDb = async () => {
        const seq = ++syncSeq;
        const [nextReceipt, nextParticipants] = await Promise.all([
          db.receipt.findUnique({
            where: { id: receiptId },
            select: { data: true },
          }),
          buildParticipants(receiptId),
        ]);

        if (!nextReceipt || seq !== syncSeq) return;

        payload$.next({
          receipt: nextReceipt.data,
          participants: nextParticipants,
        });
      };

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
        .on("presence", { event: "sync" }, syncPresenceState)
        .on("presence", { event: "join" }, syncPresenceState)
        .on("presence", { event: "leave" }, syncPresenceState)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "Receipt",
            filter: `id=eq.${receiptId}`,
          },
          async (_payload: RealtimePostgresUpdatePayload<Receipt>) => {
            await syncPayloadFromDb();
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
          async (
            _payload: RealtimePostgresChangesPayload<ReceiptUserParticipant>,
          ) => {
            await syncPayloadFromDb();
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
          async (
            _payload: RealtimePostgresChangesPayload<ReceiptMockParticipant>,
          ) => {
            await syncPayloadFromDb();
          },
        )
        .subscribe((status: REALTIME_SUBSCRIBE_STATES) => {
          if (status !== "SUBSCRIBED") return;
          void trackPresenceAndSync(channel, currentUserId, syncPresenceState);
        });

      const userUpdates$ = payload$.pipe(
        map((it) => {
          const userIds = it.participants
            .filter((p) => p.kind === "REAL")
            .map((p) => p.id)
            .sort();

          if (userIds.length === 0) return "";

          const filter = `id=in.(${userIds.join(",")})`;
          return filter;
        }),
        distinctUntilChanged(),
        switchMap((filter) => {
          if (!filter) return EMPTY;

          return new Observable((s) => {
            const usersChannel = supabase.channel(`${channelName}:users`);
            usersChannel
              .on(
                "postgres_changes",
                {
                  event: "UPDATE",
                  schema: "auth",
                  table: "users",
                  filter,
                },
                async (_payload: RealtimePostgresUpdatePayload<users>) => {
                  await syncPayloadFromDb();
                },
              )
              .subscribe();

            return () => {
              void usersChannel.unsubscribe();
            };
          });
        }),
        ignoreElements()
      );

      merge(combineLatest([payload$, onlineUserIds$]), userUpdates$)
        .pipe(
          map(([payload, onlineUserIds]) =>
            withPresence(payload, onlineUserIds),
          ),
          distinctUntilChanged(isEqual),
          takeUntil(fromEvent(req.signal, "abort")),
        )
        .subscribe({
          next: (payload) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
            );
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
