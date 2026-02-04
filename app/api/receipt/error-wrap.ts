import { ApiValidator } from "@/app/api-client/api-validator";
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getUser } from "@/utils/supabase/server";

export async function errorWrap<T extends ApiValidator>(
  req: NextRequest,
  validator: T,
  cb: (v: {
    session: { user: User };
    body: ReturnType<T["request"]["parse"]>;
  }) => Promise<NextResponse<ReturnType<T["response"]["parse"]>>>,
) {
  try {
    const user = await getUser();

    const body = validator.request.parse(await req.json()) as ReturnType<
      T["request"]["parse"]
    >;

    return await cb({ session: { user }, body });
  } catch (e: unknown) {
    console.error("API Error:", e);
    if (typeof e !== "object" || e == null) {
      return NextResponse.json({ error: "unknown" }, { status: 500 });
    }
    return NextResponse.json(
      { error: "message" in e && e.message },
      {
        status: "status" in e && typeof e.status === "number" ? e.status : 500,
      },
    );
  }
}