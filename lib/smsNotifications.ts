// lib/smsNotifications.ts
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  console.warn("[smsNotifications] Twilio environment variables are not fully set");
}

const client =
  accountSid && authToken
    ? twilio(accountSid, authToken)
    : null;

const alertRecipients = [
  process.env.PAYOUT_ALERT_PHONE_1,
  process.env.PAYOUT_ALERT_PHONE_2,
].filter(Boolean) as string[];

export type PayoutRequestAlertPayload = {
  cardId: string;
  payoutMethod: string;
  contactName: string;
  contactEmail: string;
  payoutAmountCents: number;
};

export async function sendPayoutRequestAlert(
  payload: PayoutRequestAlertPayload
) {
  if (!client) {
    console.error("[smsNotifications] Twilio client not configured");
    return;
  }

  if (alertRecipients.length === 0) {
    console.warn("[smsNotifications] No alert recipients configured");
    return;
  }

  const {
    cardId,
    payoutMethod,
    contactName,
    contactEmail,
    payoutAmountCents,
  } = payload;

  const amountDollars = (payoutAmountCents / 100).toFixed(2);

  const messageBody =
    `GiftLink payout request` +
    ` Card ${cardId}` +
    ` Method ${payoutMethod}` +
    ` Amount ${amountDollars}` +
    ` Name ${contactName}` +
    ` Email ${contactEmail}`;

  await Promise.all(
    alertRecipients.map((to) =>
      client.messages.create({
        from: fromNumber,
        to,
        body: messageBody,
      })
    )
  );
}
