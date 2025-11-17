import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabaseServer";

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
      .select(
        "id, card_id, contact_email, stripe_connect_account_id, stripe_connect_status"
      )
      .eq("id", payoutRequestId)
      .single();

    if (error || !payoutRequest) {
      console.error("payout_requests lookup error", error);
      return NextResponse.json(
        { error: "Payout request not found" },
        { status: 404 }
      );
    }

    // If it already has a connect account, just return it
    if (payoutRequest.stripe_connect_account_id) {
      return NextResponse.json({
        accountId: payoutRequest.stripe_connect_account_id,
        status: payoutRequest.stripe_connect_status,
      });
    }

    // Optional reuse logic by contact_email, can be removed if you want strict one account per request
    if (payoutRequest.contact_email) {
      const { data: existing } = await supabase
        .from("payout_requests")
        .select("stripe_connect_account_id, stripe_connect_status")
        .eq("contact_email", payoutRequest.contact_email)
        .not("stripe_connect_account_id", "is", null)
        .limit(1)
        .maybeSingle();

      if (existing?.stripe_connect_account_id) {
        await supabase
          .from("payout_requests")
          .update({
            stripe_connect_account_id: existing.stripe_connect_account_id,
            stripe_connect_status: existing.stripe_connect_status,
          })
          .eq("id", payoutRequestId);

        return NextResponse.json({
          accountId: existing.stripe_connect_account_id,
          status: existing.stripe_connect_status,
        });
      }
    }

    // Create a brand new Express account for this payout request
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        transfers: { requested: true },
      },
      business_type: "individual",
      business_profile: {
        product_description: "Receive wedding gifts through GiftLink",
      },
      email: payoutRequest.contact_email ?? undefined,
    });

    const { error: updateError } = await supabase
      .from("payout_requests")
      .update({
        stripe_connect_account_id: account.id,
        stripe_connect_status: "onboarding",
      })
      .eq("id", payoutRequestId);

    if (updateError) {
      console.error("payout_requests update error", updateError);
      return NextResponse.json(
        { error: "Failed to save Stripe account to payout_requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      accountId: account.id,
      status: "onboarding",
    });
  } catch (err: any) {
    console.error("createAccount error", err);
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
