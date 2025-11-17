// app/api/stripe/connect/onboardingLink/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabaseServer";
import { stripe } from "../../../../../lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await req.json();
    const { payoutRequestId } = body || {};

    if (!payoutRequestId) {
      return NextResponse.json(
        { error: "payoutRequestId is required" },
        { status: 400 },
      );
    }

    // Look up payout request to get current Stripe account id if any
    const { data: payout, error: payoutError } = await supabase
      .from("payout_requests")
      .select(
        "id, stripe_connect_account_id, stripe_connect_status",
      )
      .eq("id", payoutRequestId)
      .single();

    if (payoutError || !payout) {
      console.error(
        "onboardingLink: payout_request lookup error",
        payoutError,
      );
      return NextResponse.json(
        { error: "Payout request not found" },
        { status: 404 },
      );
    }

    let accountId = payout.stripe_connect_account_id as
      | string
      | null;

    // If no account yet, create one
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        business_type: "individual",
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          product_description:
            "Receive wedding gifts through GiftLink",
        },
      });

      accountId = account.id;

      const { error: updateError } = await supabase
        .from("payout_requests")
        .update({
          stripe_connect_account_id: accountId,
          stripe_connect_status: "onboarding",
        })
        .eq("id", payoutRequestId);

      if (updateError) {
        console.error(
          "onboardingLink: failed to store connect account id",
          updateError,
        );
      }
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://www.giftlink.cards";

    const refreshUrl = `${baseUrl}/claim/stripe/refresh?payout_request_id=${encodeURIComponent(
      payoutRequestId,
    )}`;
    const returnUrl = `${baseUrl}/claim/stripe/return?payout_request_id=${encodeURIComponent(
      payoutRequestId,
    )}`;

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: link.url });
  } catch (err: any) {
    console.error(
      "onboardingLink: unexpected error",
      err?.message || err,
    );
    return NextResponse.json(
      {
        error:
          err?.message ??
          "Unexpected error while creating onboarding link",
      },
      { status: 500 },
    );
  }
}
