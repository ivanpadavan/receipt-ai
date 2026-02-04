import { db } from "@/app/db";
import { NextRequest } from "next/server";
import { supabase } from "@/utils/supabase/client";
import { isEqual } from "lodash-es";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: receiptId } = await params;

  // Verify receipt exists
  let receipt = await db.receipt.findUnique({
    where: { id: receiptId },
  });

  if (!receipt) {
    return new Response("Receipt not found", { status: 404 });
  }

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

      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Receipt", filter: `id=eq.${receiptId}` },
        async () => {
          const res = await db.receipt.findUnique({
            where: { id: receiptId },
          });
          if (!res) {
            throw new Error("Receipt not found");
          }
          const data = res.data;
          console.log(`notify about ${channelName}`);
          if (isEqual(data, receipt)) {
            return;
          }
          receipt = data as unknown as typeof receipt;
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
