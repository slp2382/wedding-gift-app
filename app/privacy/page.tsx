import Link from "next/link";
import React from "react";

export const metadata = {
  title: "Privacy Policy | Givio Cards",
  description:
    "Givio Cards Privacy Policy describing what information we collect, how we use it, and how to contact us.",
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

export default function PrivacyPage() {
  const lastUpdated = "December 7, 2025";
  const supportEmail = "admin@giftlink.cards";

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-sky-50 to-slate-100 px-4 py-10 text-slate-950 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 dark:text-slate-50">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Privacy Policy
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
            This Privacy Policy explains how Givio Cards collect, uses, and shares
            information when you visit our website, purchase Givio Cards, fund
            gifts, or request a payout.
          </p>

          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
              Contents
            </div>
            <div className="mt-3 grid gap-2">
              <TocLink href="#who">1. Who we are</TocLink>
              <TocLink href="#info">2. Information we collect</TocLink>
              <TocLink href="#use">3. How we use information</TocLink>
              <TocLink href="#share">4. How we share information</TocLink>
              <TocLink href="#cookies">5. Cookies and tracking</TocLink>
              <TocLink href="#retention">6. Data retention</TocLink>
              <TocLink href="#security">7. Security</TocLink>
              <TocLink href="#rights">8. Your choices and rights</TocLink>
              <TocLink href="#children">9. Children</TocLink>
              <TocLink href="#changes">10. Changes to this policy</TocLink>
              <TocLink href="#contact">11. Contact</TocLink>
            </div>
          </div>
        </Card>

        <section id="who">
          <SectionTitle id="who">1. Who we are</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            Givio Cards is a service operated by Givio Cards, LLC. If you have
            questions about this policy, contact us at{" "}
            <a
              href={`mailto:${supportEmail}`}
              className="font-medium text-slate-950 underline-offset-4 hover:text-sky-800 hover:underline dark:text-slate-50 dark:hover:text-sky-200"
            >
              {supportEmail}
            </a>
            .
          </p>
        </section>

        <section id="info">
          <SectionTitle id="info">2. Information we collect</SectionTitle>

          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            We collect information you provide directly and information that is
            collected automatically when you use our website.
          </p>

          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            Information you provide may include:
          </p>

          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            <li>
              <strong>Purchases:</strong> name, email, shipping address, and
              order details when you buy card packs.
            </li>
            <li>
              <strong>Funding a gift:</strong> gifter name, message, amount, and
              related checkout details.
            </li>
            <li>
              <strong>Claiming a gift:</strong> recipient name, email, and payout
              information such as a Venmo handle or other payout details you
              submit.
            </li>
            <li>
              <strong>Support:</strong> information you include when you contact
              us.
            </li>
          </ul>

          <p className="mt-3 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            Information collected automatically may include:
          </p>

          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            <li>IP address and approximate location derived from IP</li>
            <li>Device and browser information</li>
            <li>Pages viewed and actions taken on the site</li>
            <li>Log and diagnostic data used to keep the service running</li>
          </ul>

          <p className="mt-3 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            Payment card information is handled by our payment processors and is
            not stored by Givio Cards.
          </p>
        </section>

        <section id="use">
          <SectionTitle id="use">3. How we use information</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            We use information to:
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            <li>Provide and operate the Givio Cards service</li>
            <li>Process purchases and fulfill physical card orders</li>
            <li>Process gift funding and payout requests</li>
            <li>Send transactional emails and service related communications</li>
            <li>Prevent fraud, abuse, and unauthorized access</li>
            <li>Maintain, debug, and improve our products</li>
            <li>Comply with legal, accounting, or regulatory obligations</li>
          </ul>
        </section>

        <section id="share">
          <SectionTitle id="share">4. How we share information</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            We share information with service providers who help us run Givio Cards.
            These providers process information on our behalf and only as needed
            to provide their services.
          </p>

          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            <li>
              <strong>Payment processing:</strong> Stripe and related payment
              partners to process transactions.
            </li>
            <li>
              <strong>Fulfillment:</strong> Printful to print and ship physical
              card packs.
            </li>
            <li>
              <strong>Messaging:</strong> Twilio or similar providers to deliver
              notifications, where enabled.
            </li>
            <li>
              <strong>Hosting and infrastructure:</strong> hosting, database,
              storage, and logging providers used to operate the service.
            </li>
          </ul>

          <p className="mt-3 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            We may also share information if required by law, to respond to legal
            requests, to protect Givio Cards or users, or in connection with a
            business transaction such as a merger, acquisition, or asset sale.
          </p>

          <p className="mt-3 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            We do not sell your personal information to data brokers.
          </p>
        </section>

        <section id="cookies">
          <SectionTitle id="cookies">5. Cookies and tracking</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            We may use cookies and similar technologies to operate the website,
            remember preferences, and understand how the site is used. Some
            cookies are necessary for the site to function.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            If we add analytics or marketing cookies in the future, we will
            update this policy to reflect those changes.
          </p>
        </section>

        <section id="retention">
          <SectionTitle id="retention">6. Data retention</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            We retain personal information for as long as necessary to provide
            the service and for legitimate business purposes, such as maintaining
            transaction records, resolving disputes, enforcing agreements, and
            complying with legal obligations.
          </p>
        </section>

        <section id="security">
          <SectionTitle id="security">7. Security</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            We use reasonable administrative, technical, and organizational
            measures to protect information. However, no method of transmission
            over the internet or method of storage is completely secure.
          </p>
        </section>

        <section id="rights">
          <SectionTitle id="rights">8. Your choices and rights</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            You may contact us to request access to, correction of, or deletion
            of certain personal information, subject to legal and operational
            limitations. You may also opt out of marketing emails by using the
            unsubscribe link in those messages.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            Depending on where you live, you may have additional privacy rights.
            We will respond to requests as required by applicable law.
          </p>
        </section>

        <section id="children">
          <SectionTitle id="children">9. Children</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            Givio Cards is not intended for children under 13 and we do not knowingly
            collect personal information from children.
          </p>
        </section>

        <section id="changes">
          <SectionTitle id="changes">10. Changes to this policy</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            We may update this Privacy Policy from time to time. The updated date
            at the top of this page indicates when changes were made. Continued
            use of Givio Cards after changes become effective means you accept the
            updated policy.
          </p>
        </section>

        <section id="contact" className="mb-10">
          <SectionTitle id="contact">11. Contact</SectionTitle>
          <p className="text-sm leading-7 text-slate-900/80 dark:text-slate-200/80">
            Questions about this Privacy Policy can be sent to{" "}
            <a
              href={`mailto:${supportEmail}`}
              className="font-medium text-slate-950 underline-offset-4 hover:text-sky-800 hover:underline dark:text-slate-50 dark:hover:text-sky-200"
            >
              {supportEmail}
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
            Tip: your footer Privacy link should point to /privacy.
          </p>
        </div>
      </div>
    </main>
  );
}
