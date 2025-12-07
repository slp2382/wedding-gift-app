export const metadata = {
  title: "Privacy Policy | GiftLink",
  description:
    "GiftLink Privacy Policy describing what information we collect, how we use it, and how to contact us.",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  marginTop: 28,
  marginBottom: 10,
  letterSpacing: -0.2,
};

const paragraphStyle: React.CSSProperties = {
  fontSize: 15.5,
  lineHeight: 1.7,
  color: "rgba(0,0,0,0.78)",
  marginTop: 10,
  marginBottom: 10,
};

const smallStyle: React.CSSProperties = {
  fontSize: 13.5,
  lineHeight: 1.6,
  color: "rgba(0,0,0,0.6)",
};

function AnchorLink(props: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={props.href}
      style={{
        color: "rgba(0,0,0,0.82)",
        textDecoration: "none",
        borderBottom: "1px solid rgba(0,0,0,0.18)",
        paddingBottom: 1,
      }}
    >
      {props.children}
    </a>
  );
}

function Card(props: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.9)",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 16,
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        padding: 18,
      }}
    >
      {props.children}
    </div>
  );
}

export default function PrivacyPage() {
  const lastUpdated = "December 7, 2025";
  const supportEmail = "admin@giftlink.cards";

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px 420px at 18% 8%, rgba(56,189,248,0.10), rgba(255,255,255,0)) , radial-gradient(850px 420px at 78% 18%, rgba(59,130,246,0.10), rgba(255,255,255,0)) , #ffffff",
        padding: "56px 16px",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ marginBottom: 18 }}>
          <h1
            style={{
              fontSize: 38,
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: -0.6,
              color: "rgba(0,0,0,0.92)",
            }}
          >
            Privacy Policy
          </h1>
          <p style={{ ...smallStyle, marginTop: 10, marginBottom: 0 }}>
            Last updated {lastUpdated}
          </p>
          <p style={{ ...smallStyle, marginTop: 8 }}>
            This page is a starting template and does not replace legal advice.
            Please review with your attorney before you rely on it.
          </p>
        </div>

        <Card>
          <p style={{ ...paragraphStyle, marginTop: 0 }}>
            This Privacy Policy explains how GiftLink collects, uses, and shares
            information when you visit our website, purchase GiftLink cards, fund
            gifts, or request a payout.
          </p>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Contents</div>
            <div style={{ display: "grid", gap: 8 }}>
              <AnchorLink href="#who">1. Who we are</AnchorLink>
              <AnchorLink href="#info">2. Information we collect</AnchorLink>
              <AnchorLink href="#use">3. How we use information</AnchorLink>
              <AnchorLink href="#share">4. How we share information</AnchorLink>
              <AnchorLink href="#cookies">5. Cookies and tracking</AnchorLink>
              <AnchorLink href="#retention">6. Data retention</AnchorLink>
              <AnchorLink href="#security">7. Security</AnchorLink>
              <AnchorLink href="#rights">8. Your choices and rights</AnchorLink>
              <AnchorLink href="#children">9. Children</AnchorLink>
              <AnchorLink href="#changes">10. Changes to this policy</AnchorLink>
              <AnchorLink href="#contact">11. Contact</AnchorLink>
            </div>
          </div>
        </Card>

        <section id="who" style={{ marginTop: 26 }}>
          <h2 style={sectionTitleStyle}>1. Who we are</h2>
          <p style={paragraphStyle}>
            GiftLink is a service operated by GiftLink, LLC. If you have
            questions about this policy, contact us at{" "}
            <a
              href={`mailto:${supportEmail}`}
              style={{
                color: "rgba(0,0,0,0.82)",
                textDecoration: "none",
                borderBottom: "1px solid rgba(0,0,0,0.18)",
                paddingBottom: 1,
              }}
            >
              {supportEmail}
            </a>
            .
          </p>
        </section>

        <section id="info">
          <h2 style={sectionTitleStyle}>2. Information we collect</h2>

          <p style={paragraphStyle}>
            We collect information you provide directly and information that is
            collected automatically when you use our website.
          </p>

          <p style={paragraphStyle}>
            Information you provide may include:
          </p>
          <ul style={{ ...paragraphStyle, paddingLeft: 20 }}>
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

          <p style={paragraphStyle}>
            Information collected automatically may include:
          </p>
          <ul style={{ ...paragraphStyle, paddingLeft: 20 }}>
            <li>IP address and approximate location derived from IP</li>
            <li>Device and browser information</li>
            <li>Pages viewed and actions taken on the site</li>
            <li>Log and diagnostic data used to keep the service running</li>
          </ul>

          <p style={paragraphStyle}>
            Payment card information is handled by our payment processors and is
            not stored by GiftLink.
          </p>
        </section>

        <section id="use">
          <h2 style={sectionTitleStyle}>3. How we use information</h2>
          <p style={paragraphStyle}>
            We use information to:
          </p>
          <ul style={{ ...paragraphStyle, paddingLeft: 20 }}>
            <li>Provide and operate the GiftLink service</li>
            <li>Process purchases and fulfill physical card orders</li>
            <li>Process gift funding and payout requests</li>
            <li>Send transactional emails and service related communications</li>
            <li>Prevent fraud, abuse, and unauthorized access</li>
            <li>Maintain, debug, and improve our products</li>
            <li>Comply with legal, accounting, or regulatory obligations</li>
          </ul>
        </section>

        <section id="share">
          <h2 style={sectionTitleStyle}>4. How we share information</h2>
          <p style={paragraphStyle}>
            We share information with service providers who help us run GiftLink.
            These providers process information on our behalf and only as needed
            to provide their services.
          </p>

          <ul style={{ ...paragraphStyle, paddingLeft: 20 }}>
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

          <p style={paragraphStyle}>
            We may also share information if required by law, to respond to legal
            requests, to protect GiftLink or users, or in connection with a
            business transaction such as a merger, acquisition, or asset sale.
          </p>

          <p style={paragraphStyle}>
            We do not sell your personal information to data brokers.
          </p>
        </section>

        <section id="cookies">
          <h2 style={sectionTitleStyle}>5. Cookies and tracking</h2>
          <p style={paragraphStyle}>
            We may use cookies and similar technologies to operate the website,
            remember preferences, and understand how the site is used. Some
            cookies are necessary for the site to function.
          </p>
          <p style={paragraphStyle}>
            If we add analytics or marketing cookies in the future, we will
            update this policy to reflect those changes.
          </p>
        </section>

        <section id="retention">
          <h2 style={sectionTitleStyle}>6. Data retention</h2>
          <p style={paragraphStyle}>
            We retain personal information for as long as necessary to provide
            the service and for legitimate business purposes, such as maintaining
            transaction records, resolving disputes, enforcing agreements, and
            complying with legal obligations.
          </p>
        </section>

        <section id="security">
          <h2 style={sectionTitleStyle}>7. Security</h2>
          <p style={paragraphStyle}>
            We use reasonable administrative, technical, and organizational
            measures to protect information. However, no method of transmission
            over the internet or method of storage is completely secure.
          </p>
        </section>

        <section id="rights">
          <h2 style={sectionTitleStyle}>8. Your choices and rights</h2>
          <p style={paragraphStyle}>
            You may contact us to request access to, correction of, or deletion
            of certain personal information, subject to legal and operational
            limitations. You may also opt out of marketing emails by using the
            unsubscribe link in those messages.
          </p>
          <p style={paragraphStyle}>
            Depending on where you live, you may have additional privacy rights.
            We will respond to requests as required by applicable law.
          </p>
        </section>

        <section id="children">
          <h2 style={sectionTitleStyle}>9. Children</h2>
          <p style={paragraphStyle}>
            GiftLink is not intended for children under 13 and we do not knowingly
            collect personal information from children.
          </p>
        </section>

        <section id="changes">
          <h2 style={sectionTitleStyle}>10. Changes to this policy</h2>
          <p style={paragraphStyle}>
            We may update this Privacy Policy from time to time. The updated date
            at the top of this page indicates when changes were made. Continued
            use of GiftLink after changes become effective means you accept the
            updated policy.
          </p>
        </section>

        <section id="contact" style={{ marginBottom: 40 }}>
          <h2 style={sectionTitleStyle}>11. Contact</h2>
          <p style={paragraphStyle}>
            Questions about this Privacy Policy can be sent to{" "}
            <a
              href={`mailto:${supportEmail}`}
              style={{
                color: "rgba(0,0,0,0.82)",
                textDecoration: "none",
                borderBottom: "1px solid rgba(0,0,0,0.18)",
                paddingBottom: 1,
              }}
            >
              {supportEmail}
            </a>
            .
          </p>
        </section>

        <div style={{ ...smallStyle, marginTop: 10 }}>
          Tip: your footer Privacy link should point to /privacy.
        </div>
      </div>
    </main>
  );
}
