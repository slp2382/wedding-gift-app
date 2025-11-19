// app/api/env-debug/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    PRINTFUL_API_KEY: process.env.PRINTFUL_API_KEY
      ? `present (length ${process.env.PRINTFUL_API_KEY.length})`
      : "missing",
    SUPABASE_URL: process.env.SUPABASE_URL ? "present" : "missing",
    PRINTFUL_SYNC_VARIANT_ID:
      process.env.PRINTFUL_SYNC_VARIANT_ID ?? "missing",
  });
}
