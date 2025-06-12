import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}

// No need for Edge runtime as this is a simple health check
export const runtime = 'nodejs';
