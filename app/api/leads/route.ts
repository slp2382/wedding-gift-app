import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabaseServer";

function isValidEmail(email: string) {
  const v = email.trim();
  if (v.length < 6 || v.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export const POST = async (request: NextRequest) => {
  try {
    const body = (await request.json()) as {
      email?: string;
      source?: string | null;
      utm_source?: string | null;
      utm_medium?: string | null;
      utm_campaign?: string | null;
      utm_term?: string | null;
      utm_content?: string | null;
      consent?: boolean;
      website?: string | null;
    };

    const website = (body.website ?? "").trim();
    if (website) {
      return NextResponse.json({ ok: true });
    }

    const email = (body.email ?? "").trim();
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const supabase = createServerClient();

    const row = {
      email,
      source: body.source ?? "homepage_popup",
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      utm_term: body.utm_term ?? null,
      utm_content: body.utm_content ?? null,
      consent: Boolean(body.consent),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("leads")
      .upsert(row, { onConflict: "email_lc" });

    if (error) {
      console.error("Lead insert failed", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Lead route error", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
};
