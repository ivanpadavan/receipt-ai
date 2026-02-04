import { db } from "@/app/db";
import { NextRequest, NextResponse } from "next/server";
import { isEqual } from "lodash-es";
import putValidator from "@/app/api-client/receipt/put";
import { errorWrap } from "@/app/api/receipt/error-wrap";
import { serverSupabase } from "@/utils/supabase/server";

export const runtime = "nodejs";

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
  let lastData = receipt.data;

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
      const channel = (await serverSupabase()).channel(channelName);

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
            const data = payload?.new?.data;
            if (!data) return;
            // if (isEqual(data, lastData)) return;
            lastData = data;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
            );
          },
        )
        .subscribe();

      controller.enqueue(encoder.encode(`data: "connection established"\n\n`));


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
