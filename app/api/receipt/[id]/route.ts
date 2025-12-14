import { db } from "@/app/db";
import { NextRequest } from "next/server";
import { Client } from 'pg';

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
    async start(controller) {
      const encoder = new TextEncoder();

      // Add this connection to the receipt's connection set
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
      });
      await client.connect();

      // Подписываемся на канал
      const channelName = `receipt-${receiptId}`
      await client.query(`LISTEN "${channelName}"`);
      console.log(`Listening to ${channelName}`);
      client.on('notification', async () => {
        const res = await db.receipt.findUnique({
          where: { id: receiptId },
        });
        if (!res) {
          throw new Error('Receipt not found');
        }
        const data = res.data;
        console.log(`notify about ${channelName}`);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      });
      client.on('error', (err) => {
        console.error('Connection error:', err);
      });

      controller.enqueue(encoder.encode(`data: "connection established"\n\n`));


      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        try {
          controller.close();
          client.end();
        } catch {
          // Already closed
        }
      });

      await new Promise(() => {});
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
