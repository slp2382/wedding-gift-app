import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabaseServer";

// Update these to match your actual domain and routes
const REFRESH_URL = "https://www.giftlink.cards/claim/stripe/refresh";
const RETURN_URL = "https://www.giftlink.cards/claim/stripe/return";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { payoutRequestId } = await req.json();

    if (!payoutRequestId) {
      return NextResponse.json(
        { error: "payoutRequestId is required" },
        { status: 400 }
      );
    }

    const { data: payoutRequest, error } = await supabase
      .from("payout_requests")
      .select("stripe_connect_account_id")
      .eq("id", payoutRequestId)
      .single();

    if (error || !payoutRequest) {
      console.error("payout_requests lookup error", error);
      return NextResponse.json(
        { error: "Payout request not found" },
        { status: 404 }
      );
    }

    if (!payoutRequest.stripe_connect_account_id) {
      return NextResponse.json(
        { error: "No Stripe Connect account on this payout request" },
        { status: 400 }
      );
    }

    const link = await stripe.accountLinks.create({
      account: payoutRequest.stripe_connect_account_id,
      refresh_url: REFRESH_URL,
      return_url: RETURN_URL,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: link.url });
  } catch (err: any) {
    console.error("onboardingLink error", err);
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
