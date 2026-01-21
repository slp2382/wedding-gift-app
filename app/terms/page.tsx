import Link from "next/link";
import React from "react";

export const metadata = {
  title: "Terms of Use | GiftLink",
  description:
    "GiftLink Terms of Use covering purchases, gifting, claiming, payouts, and service rules.",
};

function TocLink(props: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={props.href}
      className="text-sm text-slate-900/80 underline-offset-4 hover:text-sky-800 hover:underline dark:text-slate-200/80 dark:hover:text-sky-200"
    >
      {props.children}
    </a>
  );
}

function SectionTitle(props: { id?: string; children: React.ReactNode }) {
  return (
    <h2
      id={props.id}
      className="mt-8 mb-3 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50"
    >
      {props.children}
    </h2>
  );
}

function Card(props: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-sky-200/80 bg-sky-50/80 p-5 shadow-lg shadow-sky-100/70 backdrop-blur-sm dark:border-sky-700/70 dark:bg-sky-950/60 dark:shadow-none">
      {props.children}
    </div>
  );
}

export default function TermsPage() {
  const lastUpdated = "December 7, 2025";

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-sky-50 to-slate-100 px-4 py-10 text-slate-950 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 dark:text-slate-50">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Terms of Use
            </h1>
            <p className="text-xs text-slate-900/70 dark:text-slate-200/80">
              Last updated {lastUpdated}
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-sky-200/80 bg-sky-50/80 px-4 py-2 text-sm font-medium text-slate-950 shadow-sm backdrop-blur hover:bg-white dark:border-sky-700/70 dark:bg-sky-950/60 dark:text-slate-50 dark:hover:bg-slate-950"
          >
            Return Home
          </Link>
        </header>

        <Card>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            These Terms of Use govern your access to and use of GiftLink. By
            using our website or services, purchasing GiftLink cards, funding a
            gift, or requesting a payout, you agree to these Terms.
          </p>

          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
              Contents
            </div>
            <div className="mt-3 grid gap-2">
              <TocLink href="#about">1. About GiftLink</TocLink>
              <TocLink href="#eligibility">2. Eligibility</TocLink>
              <TocLink href="#howitworks">3. How GiftLink Works</TocLink>
              <TocLink href="#purchases">4. Purchases, Pricing, Shipping</TocLink>
              <TocLink href="#funding">5. Funding a Gift</TocLink>
              <TocLink href="#claiming">6. Claiming and Payout Requests</TocLink>
              <TocLink href="#prohibited">7. Prohibited Use</TocLink>
              <TocLink href="#thirdparties">8. Third Party Services</TocLink>
              <TocLink href="#content">9. User Content and Messages</TocLink>
              <TocLink href="#disclaimer">10. Disclaimers</TocLink>
              <TocLink href="#liability">11. Limitation of Liability</TocLink>
              <TocLink href="#termination">12. Termination</TocLink>
              <TocLink href="#changes">13. Changes</TocLink>
              <TocLink href="#contact">14. Contact</TocLink>
            </div>
          </div>
        </Card>

        <section id="about">
          <SectionTitle id="about">1. About GiftLink</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            GiftLink provides physical greeting cards that include a unique QR
            code. The QR code links to a webpage where a gift can be funded by a
            gifter and later claimed by a recipient. GiftLink, LLC is a company
            organized in North Carolina, United States.
          </p>
        </section>

        <section id="eligibility">
          <SectionTitle id="eligibility">2. Eligibility</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            You must be able to form a binding contract in your jurisdiction to
            use GiftLink. You represent that the information you provide is
            accurate and that you will comply with these Terms and applicable
            laws.
          </p>
        </section>

        <section id="howitworks">
          <SectionTitle id="howitworks">3. How GiftLink Works</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            GiftLink is designed to support two phases using the same QR code:
          </p>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            <li>
              Funding. A gifter scans the QR code, enters gift details, and
              completes payment using our checkout flow.
            </li>
            <li>
              Claiming. The recipient scans the same QR code, provides required
              information, and submits a payout request.
            </li>
          </ol>
          <p className="mt-3 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            GiftLink uses internal status tracking to help prevent duplicate
            claims and to support reconciliation, support, and fraud prevention.
          </p>
        </section>

        <section id="purchases">
          <SectionTitle id="purchases">4. Purchases, Pricing, Shipping</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            If you purchase physical GiftLink cards or packs, pricing, shipping,
            taxes, and availability will be shown at checkout. Delivery times
            may vary. If a product is unavailable or a fulfillment issue occurs,
            we may contact you to resolve it.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            Refund policies for physical goods may differ from policies for
            funded gifts. If you need help, contact us using the information
            below.
          </p>
        </section>

        <section id="funding">
          <SectionTitle id="funding">5. Funding a Gift</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            Funding a gift is processed through a payment provider. By funding a
            gift, you authorize the payment and you agree to comply with the
            payment provider terms that apply to your transaction.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            We may delay or refuse a transaction if we believe it is suspicious,
            fraudulent, or violates these Terms or applicable law.
          </p>
        </section>

        <section id="claiming">
          <SectionTitle id="claiming">6. Claiming and Payout Requests</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            To claim a gift, a recipient may be asked to provide contact details
            and payout information. Payout methods may vary over time. Payouts
            may be subject to verification, review, or additional information
            requests to reduce fraud and comply with legal obligations.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            We are not responsible for delays, denials, or outages caused by
            third party payout networks or providers. If a payout cannot be
            completed due to incorrect recipient information, we may request
            updated information.
          </p>
        </section>

        <section id="prohibited">
          <SectionTitle id="prohibited">7. Prohibited Use</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            You agree not to misuse GiftLink. Prohibited conduct includes:
          </p>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            <li>Attempting to claim gifts you are not entitled to claim.</li>
            <li>Fraud, deception, or impersonation.</li>
            <li>Using GiftLink for illegal activity or prohibited transactions.</li>
            <li>Interfering with the security or operation of the service.</li>
          </ol>
        </section>

        <section id="thirdparties">
          <SectionTitle id="thirdparties">8. Third Party Services</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            GiftLink may rely on third party services for payments, hosting,
            fulfillment, messaging, and analytics. Those providers may have
            their own terms and policies. We do not control third party services
            and are not responsible for their performance.
          </p>
        </section>

        <section id="content">
          <SectionTitle id="content">9. User Content and Messages</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            GiftLink may allow gifters to include names and messages with a gift.
            You are responsible for the content you submit. You agree not to
            submit content that is unlawful, abusive, or infringes the rights of
            others.
          </p>
        </section>

        <section id="disclaimer">
          <SectionTitle id="disclaimer">10. Disclaimers</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            GiftLink is provided on an as is and as available basis. We make no
            warranties of any kind, express or implied, including warranties of
            merchantability, fitness for a particular purpose, and
            noninfringement, to the extent permitted by law.
          </p>
        </section>

        <section id="liability">
          <SectionTitle id="liability">11. Limitation of Liability</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            To the extent permitted by law, GiftLink and its affiliates will not
            be liable for indirect, incidental, special, consequential, or
            punitive damages, or any loss of profits, data, or goodwill, arising
            from your use of the service. Our total liability for claims
            relating to the service will not exceed the amount you paid to
            GiftLink for the product or service giving rise to the claim during
            the twelve months before the event.
          </p>
        </section>

        <section id="termination">
          <SectionTitle id="termination">12. Termination</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            We may suspend or terminate access to the service if we reasonably
            believe you have violated these Terms or if doing so is necessary to
            protect GiftLink, users, or third parties.
          </p>
        </section>

        <section id="changes">
          <SectionTitle id="changes">13. Changes</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            We may update these Terms from time to time. The updated date at the
            top of this page indicates when changes were made. Continued use of
            GiftLink after changes become effective means you accept the updated
            Terms.
          </p>
        </section>

        <section id="contact" className="mb-10">
          <SectionTitle id="contact">14. Contact</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            Questions about these Terms can be sent to{" "}
            <a
              href="mailto:admin@giftlink.cards"
              className="font-medium text-slate-950 underline-offset-4 hover:text-sky-800 hover:underline dark:text-slate-50 dark:hover:text-sky-200"
            >
              admin@giftlink.cards
            </a>
            .
          </p>
        </section>

        <div className="mt-8 flex flex-col items-center gap-3 pb-6 text-center">
          <Link
            href="/"
            className="inline-flex w-full max-w-xs items-center justify-center rounded-full bg-sky-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 dark:bg-sky-500 dark:hover:bg-sky-400"
          >
            Return Home
          </Link>

          <p className="text-xs text-slate-900/70 dark:text-slate-200/80">
            Tip: link your footer Terms to this page at /terms.
          </p>
        </div>
      </div>
    </main>
  );
}
