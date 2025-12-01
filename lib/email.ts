import nodemailer from "nodemailer";

type OrderEmailInput = {
  to: string;
  orderId: string;
  cardCount: number;
  amountTotalCents: number;
  shippingName?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingPostalCode?: string | null;
};

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export async function sendOrderConfirmationEmail(input: OrderEmailInput) {
  const host = requiredEnv("ZOHO_SMTP_HOST");
  const port = Number(requiredEnv("ZOHO_SMTP_PORT"));
  const user = requiredEnv("ZOHO_SMTP_USER");
  const pass = requiredEnv("ZOHO_SMTP_PASS");
  const secure = (process.env.ZOHO_SMTP_SECURE ?? "false") === "true";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });

  const from = `"GiftLink" <${user}>`;

  const shipLine = [
    input.shippingName,
    [input.shippingCity, input.shippingState, input.shippingPostalCode]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join("\n");

  const dollars = (input.amountTotalCents / 100).toFixed(2);

  const subject = "GiftLink order confirmation";

  const text =
    `Thanks for your GiftLink order.\n\n` +
    `Order ID: ${input.orderId}\n` +
    `Cards: ${input.cardCount}\n` +
    `Total: $${dollars}\n` +
    (shipLine ? `\nShipping:\n${shipLine}\n` : "") +
    `\nQuestions? Reply to this email.\n`;

  const html =
    `<div style="font-family:Arial,sans-serif;line-height:1.45">` +
    `<p>Thanks for your GiftLink order.</p>` +
    `<p><strong>Order ID:</strong> ${input.orderId}<br/>` +
    `<strong>Cards:</strong> ${input.cardCount}<br/>` +
    `<strong>Total:</strong> $${dollars}</p>` +
    (shipLine
      ? `<p><strong>Shipping</strong><br/>${shipLine.replace(/\n/g, "<br/>")}</p>`
      : "") +
    `<p>Questions? Reply to this email.</p>` +
    `</div>`;

  await transporter.sendMail({
    from,
    to: input.to,
    subject,
    text,
    html,
  });
}
