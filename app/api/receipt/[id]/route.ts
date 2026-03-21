import { db } from "@/app/db";
import { NextRequest, NextResponse } from "next/server";
import { isEqual } from "lodash-es";
import putValidator from "@/app/api-client/receipt/put";
import { errorWrap } from "@/app/api/receipt/error-wrap";
import { getUser, serverSupabase } from "@/utils/supabase/server";
import { buildParticipants } from "@/app/db-utils/build-participants";
import { trackPresenceAndSync } from "@/app/api/receipt/[id]/trackPresenceAndSync";
import { createSseResponse } from "@/app/api/receipt/sse";
import type { ParticipantDTO } from "@/model/receipt/model";
import type {
  Receipt,
  ReceiptMockParticipant,
  ReceiptUserParticipant,
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
  ignoreElements,
  map,
  merge,
  Observable,
  switchMap,
} from "rxjs";
import { tap } from "rxjs/operators";

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

  return createSseResponse(req, (stream) => {
    // Add this connection to the receipt's connection set
    const channelName = `topic:${receiptId}`;
    const channel = supabase.channel(channelName);
    const currentUserIdPromise = getUser(supabase).then((user) => user.id);
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
        async () => {
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
        async () => {
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
        async () => {
          await syncPayloadFromDb();
        },
      )
      .subscribe((status: REALTIME_SUBSCRIBE_STATES) => {
        if (status !== "SUBSCRIBED") return;
        void currentUserIdPromise.then((currentUserId) =>
          trackPresenceAndSync(channel, currentUserId, syncPresenceState),
        );
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

        return new Observable(() => {
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
              async () => {
                await syncPayloadFromDb();
              },
            )
            .subscribe();

          return () => {
            void usersChannel.unsubscribe();
          };
        });
      }),
      ignoreElements(),
    );

    return merge(combineLatest([payload$, onlineUserIds$]), userUpdates$).pipe(
      map(([payload, onlineUserIds]) => withPresence(payload, onlineUserIds)),
      distinctUntilChanged(isEqual),
      tap({
        next: (payload) => {
          stream.sendData(payload);
        },
        complete: () => {
          try {
            void channel.untrack();
            void channel.unsubscribe();
          } catch {
            // Already closed
          }
        },
      }),
    );
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
