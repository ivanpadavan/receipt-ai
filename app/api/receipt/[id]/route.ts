import { db } from "@/app/db";
import { NextRequest, NextResponse } from "next/server";
import { isEqual } from "lodash-es";
import putValidator from "@/app/api-client/receipt/put";
import { errorWrap } from "@/app/api/receipt/error-wrap";
import { serverSupabase } from "@/utils/supabase/server";
import { buildParticipants } from "@/app/db-utils/build-participants";
import type {
  Receipt,
  ReceiptMockParticipant,
  ReceiptUserParticipant,
} from "@/prisma/generated/prisma/client";
import type {
  RealtimePostgresChangesPayload,
  RealtimePostgresUpdatePayload,
} from "@supabase/supabase-js";
import { BehaviorSubject, distinctUntilChanged, fromEvent, takeUntil } from "rxjs";

export const runtime = "nodejs";

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

      channel
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
        .subscribe();

      payload$.pipe(distinctUntilChanged(isEqual), takeUntil(fromEvent(req.signal, 'abort'))).subscribe({
        next: (payload) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        },
        complete: () => {
          try {
            clearInterval(heartbeat);
            controller.close();
            channel.unsubscribe();
          } catch {
            // Already closed
          }
        }
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
