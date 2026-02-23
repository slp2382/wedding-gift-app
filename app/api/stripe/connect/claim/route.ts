import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-10-29.clover",
})

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function POST(req: NextRequest) {
  try {
    const { payoutRequestId } = await req.json()

    if (!payoutRequestId) {
      return NextResponse.json({ error: "Missing payoutRequestId" }, { status: 400 })
    }

    const { data: payoutRequest, error } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("id", payoutRequestId)
      .single()

    if (error || !payoutRequest) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 })
    }

    if (payoutRequest.status === "completed") {
      return NextResponse.json({ error: "Already paid" }, { status: 400 })
    }

    const grossAmountCents = payoutRequest.payout_amount_cents

    // ✅ Flat $2.50 fee
    const FEE_FLAT_CENTS = 250
    const feeCents = FEE_FLAT_CENTS

    // Guardrail to prevent negative transfers
    const netAmountCents = Math.max(grossAmountCents - feeCents, 0)

    // Transfer to connected account
    const transfer = await stripe.transfers.create({
      amount: netAmountCents,
      currency: payoutRequest.payout_currency || "usd",
      destination: payoutRequest.stripe_connect_account_id,
    })

    // Update payout request
    await supabase
      .from("payout_requests")
      .update({
        status: "completed",
        stripe_transfer_id: transfer.id,
      })
      .eq("id", payoutRequestId)

    // Mark card as claimed
    await supabase
      .from("cards")
      .update({
        claimed: true,
        claimed_at: new Date().toISOString(),
      })
      .eq("card_id", payoutRequest.card_id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Stripe Connect payout error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}