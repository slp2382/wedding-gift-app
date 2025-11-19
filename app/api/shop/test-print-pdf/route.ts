// app/api/shop/test-print-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Simple stub route just to satisfy Next's route type validator.
// This is not used by your main GiftLink flows.
export async function GET(_req: NextRequest) {
  return NextResponse.json(
    {
      ok: true,
      message: "Legacy test print endpoint (no-op).",
    },
    { status: 200 },
  );
}
