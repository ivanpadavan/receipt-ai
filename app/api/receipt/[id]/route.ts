import { db } from "@/app/db";
import { NextRequest } from "next/server";

export const connections = new Map<string, Set<ReadableStreamDefaultController>>();

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

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the receipt's connection set
      if (!connections.has(receiptId)) {
        connections.set(receiptId, new Set());
      }
      connections.get(receiptId)!.add(controller);
      console.log(connections.size);

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        connections.get(receiptId)?.delete(controller);
        if (connections.get(receiptId)?.size === 0) {
          connections.delete(receiptId);
        }
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      });
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
