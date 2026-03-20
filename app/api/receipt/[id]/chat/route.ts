import { NextRequest, NextResponse } from "next/server";
import { errorWrap } from "@/app/api/receipt/error-wrap";
import validator from "@/app/api/receipt/[id]/chat/validator";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await params;

  return errorWrap(req, validator, async ({ body }) => {
    const response = validator.response.parse({
      type: "question",
      message: body.message,
    });

    return NextResponse.json(response);
  });
}
