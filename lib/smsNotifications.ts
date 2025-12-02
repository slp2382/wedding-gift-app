import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  console.warn(
    "[smsNotifications] Twilio environment variables are not fully set",
  );
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

const alertRecipients = [
  process.env.PAYOUT_ALERT_PHONE_1,
  process.env.PAYOUT_ALERT_PHONE_2,
]
  .map((v) => (v ? String(v).trim() : ""))
  .filter(Boolean);

export type PayoutRequestAlertPayload = {
  payoutRequestId?: string;
  cardId: string;
  payoutMethod: string;
  contactName: string;
  contactEmail: string;
  payoutAmountCents: number;
};

export async function sendPayoutRequestAlert(payload: PayoutRequestAlertPayload) {
  if (!client) {
    console.error("[smsNotifications] Twilio client not configured");
    return { ok: false as const, reason: "no_client" as const };
  }

  if (!fromNumber) {
    console.error("[smsNotifications] TWILIO_FROM_NUMBER missing");
    return { ok: false as const, reason: "no_from" as const };
  }

  if (alertRecipients.length === 0) {
    console.warn("[smsNotifications] No alert recipients configured");
    return { ok: false as const, reason: "no_recipients" as const };
  }

  const payoutMethodNorm = String(payload.payoutMethod).trim().toLowerCase();
  if (payoutMethodNorm !== "venmo") {
    return { ok: false as const, reason: "not_venmo" as const };
  }

  const amountDollars = (payload.payoutAmountCents / 100).toFixed(2);
  const timestamp = new Date().toISOString();

  const messageBody =
    `GiftLink Venmo payout requested\n` +
    `Time: ${timestamp}\n` +
    (payload.payoutRequestId ? `Request: ${payload.payoutRequestId}\n` : "") +
    `Card: ${payload.cardId}\n` +
    `Amount: $${amountDollars}\n` +
    `Name: ${payload.contactName}\n` +
    `Email: ${payload.contactEmail}`;

  const results = await Promise.allSettled(
    alertRecipients.map((to) =>
      client.messages.create({
        from: fromNumber,
        to,
        body: messageBody,
      }),
    ),
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  if (failed > 0) {
    const errors = results
      .filter((r) => r.status === "rejected")
      .map(
        (r) =>
          (r as PromiseRejectedResult).reason?.message ??
          String((r as PromiseRejectedResult).reason),
      );
    console.warn("[smsNotifications] Some SMS alerts failed", {
      sent,
      failed,
      errors,
    });
  }

  return { ok: sent > 0, sent, failed };
}
