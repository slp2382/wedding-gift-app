// app/api/stripe/connect/onboardingLink/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabaseServer";
import { stripe } from "../../../../../lib/stripe";

export const runtime = "nodejs";

function expectedLivemode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return key.startsWith("sk_live_");
}

async function isUsableConnectedAccount(accountId: string): Promise<boolean> {
  try {
    const acct = await stripe.accounts.retrieve(accountId);
    const live = Boolean((acct as any).livemode);
    return live === expectedLivemode();
  } catch {
    return false;
  }
}

async function createAndStoreAccount(args: {
  supabase: any;
  payoutRequestId: string;
  email?: string | null;
}): Promise<string> {
  const account = await stripe.accounts.create({
    type: "express",
    business_type: "individual",
    capabilities: {
      transfers: { requested: true },
    },
    
    email: args.email ?? undefined,
  });

  await args.supabase
    .from("payout_requests")
    .update({
      stripe_connect_account_id: account.id,
      stripe_connect_status: "onboarding",
    })
    .eq("id", args.payoutRequestId);

  return account.id;
}

function isAccountLinkMismatchError(err: any): boolean {
  const msg = String(err?.message ?? "").toLowerCase();
  return (
    msg.includes("not connected to your platform") ||
    msg.includes("does not exist") ||
    err?.code === "resource_missing"
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await req.json();
    const { payoutRequestId } = body || {};

    if (!payoutRequestId) {
      return NextResponse.json({ error: "payoutRequestId is required" }, { status: 400 });
    }

    const { data: payout, error: payoutError } = await supabase
      .from("payout_requests")
      .select("id, contact_email, stripe_connect_account_id, stripe_connect_status")
      .eq("id", payoutRequestId)
      .single();

    if (payoutError || !payout) {
      console.error("onboardingLink: payout_request lookup error", payoutError);
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    }

    let accountId: string | null = payout.stripe_connect_account_id ?? null;

    // Validate existing account id
    if (accountId) {
      const ok = await isUsableConnectedAccount(accountId);
      if (!ok) accountId = null;
    }

    // Create if missing or invalid
    if (!accountId) {
      accountId = await createAndStoreAccount({
        supabase,
        payoutRequestId,
        email: payout.contact_email ?? null,
      });
    }

    const baseUrl =
      process.env.GIFTLINK_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://www.giftlink.cards";

    const refreshUrl = `${baseUrl}/claim/stripe/refresh?payout_request_id=${encodeURIComponent(
      payoutRequestId,
    )}`;
    const returnUrl = `${baseUrl}/claim/stripe/return?payout_request_id=${encodeURIComponent(
      payoutRequestId,
    )}`;

    // Create link, retry once if Stripe says the account is not connected (stale acct id)
    try {
      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });

      return NextResponse.json({ url: link.url });
    } catch (err: any) {
      if (!isAccountLinkMismatchError(err)) throw err;

      console.warn("onboardingLink: stale connect account, recreating", err?.message ?? err);

      // Recreate account and retry
      const newAccountId = await createAndStoreAccount({
        supabase,
        payoutRequestId,
        email: payout.contact_email ?? null,
      });

      const link2 = await stripe.accountLinks.create({
        account: newAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });

      return NextResponse.json({ url: link2.url, recreated: true });
    }
  } catch (err: any) {
    console.error("onboardingLink: unexpected error", err?.message || err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error while creating onboarding link" },
      { status: 500 },
    );
  }
}
