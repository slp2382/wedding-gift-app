import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function expectedLivemode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return key.startsWith("sk_live_");
}

async function isUsableConnectedAccount(accountId: string): Promise<boolean> {
  try {
    const acct = await stripe.accounts.retrieve(accountId);
    if (!acct || typeof acct !== "object") return false;

    const live = Boolean((acct as any).livemode);
    return live === expectedLivemode();
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { payoutRequestId } = await req.json();

    if (!payoutRequestId) {
      return NextResponse.json(
        { error: "payoutRequestId is required" },
        { status: 400 },
      );
    }

    const { data: payoutRequest, error } = await supabase
      .from("payout_requests")
      .select("id, contact_email, stripe_connect_account_id, stripe_connect_status")
      .eq("id", payoutRequestId)
      .single();

    if (error || !payoutRequest) {
      console.error("payout_requests lookup error", error);
      return NextResponse.json(
        { error: "Payout request not found" },
        { status: 404 },
      );
    }

    // If it already has a connect account, verify it belongs to the current Stripe mode
    if (payoutRequest.stripe_connect_account_id) {
      const ok = await isUsableConnectedAccount(
        payoutRequest.stripe_connect_account_id,
      );
      if (ok) {
        try {
          await stripe.accounts.update(payoutRequest.stripe_connect_account_id, {
            business_profile: {
              url: "https://giviocards.com",
              product_description:
                "One time gift recipient receiving a payout from Givio Cards.",
            },
          });
        } catch (err) {
          console.error("connect account business_profile update error", err);
        }

        return NextResponse.json({
          accountId: payoutRequest.stripe_connect_account_id,
          status: payoutRequest.stripe_connect_status,
          reused: true,
        });
      }

      // Stale or wrong mode. Clear it so we can recreate cleanly.
      await supabase
        .from("payout_requests")
        .update({
          stripe_connect_account_id: null,
          stripe_connect_status: "not_onboarded",
        })
        .eq("id", payoutRequestId);
    }

    // Create a brand new Express account for this payout request
    const account = await stripe.accounts.create({
      type: "express",
      business_type: "individual",
      capabilities: {
        transfers: { requested: true },
      },
      email: payoutRequest.contact_email ?? undefined,
      business_profile: {
        url: "https://giviocards.com",
        product_description: "One time gift recipient receiving a payout from Givio Cards.",
      },
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
        { status: 500 },
      );
    }

    return NextResponse.json({
      accountId: account.id,
      status: "onboarding",
      reused: false,
    });
  } catch (err: any) {
    console.error("createAccount error", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
