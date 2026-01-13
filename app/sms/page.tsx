// app/sms/page.tsx

export const metadata = {
  title: "GiftLink SMS Opt In",
  description:
    "SMS program information and opt in instructions for GiftLink toll free messaging.",
};

export default function SmsOptInPage() {
  const brand = "GiftLink";
  const sendingNumberDisplay = "(866) 825 1960";

  const privacyUrl = "https://www.giftlink.cards/privacy";
  const termsUrl = "https://www.giftlink.cards/terms";
  const supportEmail = "Admin@GiftLink.cards";

  const optInKeyword = "START";
  const stopKeyword = "STOP";
  const helpKeyword = "HELP";

  const lastUpdated = "January 12, 2026";

  const programPurpose =
    "Internal operational alerts for the GiftLink team. This program is used for payout and order operations notifications and does not send marketing messages.";

  const programEligibility =
    "This SMS program is intended for GiftLink team members and authorized contractors only. Only people who text START to the number above will be enrolled.";

  const messageTypes = [
    "Venmo payout request alerts",
    "Operational and status notifications related to GiftLink orders and fulfillment",
  ];

  const messageFrequency =
    "Message frequency varies and depends on payout and operational activity.";

  const costsLine = "Message and data rates may apply.";

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-2xl font-semibold">{brand} SMS Opt In</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            This page explains how to opt in to receive text messages from {brand} and
            how to stop or get help.
          </p>

          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-medium">Program purpose</h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-200">{programPurpose}</p>
          </section>

          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-medium">Program eligibility</h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              {programEligibility}
            </p>
          </section>

          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-medium">Message types</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
              {messageTypes.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>

          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-medium">How to opt in</h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              To opt in, text <span className="font-semibold">{optInKeyword}</span> to{" "}
              <span className="font-semibold">{sendingNumberDisplay}</span>.
            </p>

            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              By texting <span className="font-semibold">{optInKeyword}</span>, you
              consent to receive recurring text messages (SMS) from {brand} for the
              internal operational purposes described on this page. {messageFrequency}{" "}
              Reply <span className="font-semibold">{stopKeyword}</span> to unsubscribe
              and <span className="font-semibold">{helpKeyword}</span> for help.{" "}
              {costsLine} Consent is not a condition of purchase.
            </p>

            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              After you text <span className="font-semibold">{optInKeyword}</span>, you
              will receive a confirmation message.
            </p>
          </section>

          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-medium">Message frequency</h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-200">{messageFrequency}</p>
          </section>

          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-medium">Opt out and help</h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              To stop receiving messages, reply{" "}
              <span className="font-semibold">{stopKeyword}</span>.
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              For help, reply <span className="font-semibold">{helpKeyword}</span>.
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              You may receive a final confirmation message after opting out.
            </p>
          </section>

          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-medium">Costs</h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-200">{costsLine}</p>
          </section>

          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-medium">Privacy</h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              Opt in data and consent for this SMS program will not be shared with any
              third parties.
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              See our{" "}
              <a
                href={privacyUrl}
                className="font-medium underline underline-offset-4"
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href={termsUrl} className="font-medium underline underline-offset-4">
                Terms of Service
              </a>
              .
            </p>
          </section>

          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-medium">Support</h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              For support, email{" "}
              <a
                href={`mailto:${supportEmail}`}
                className="font-medium underline underline-offset-4"
              >
                {supportEmail}
              </a>
              .
            </p>
          </section>
        </div>

        <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
          Last updated {lastUpdated}
        </p>
      </div>
    </main>
  );
}
