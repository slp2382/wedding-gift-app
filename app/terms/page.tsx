export const metadata = {
  title: "Terms of Use | GiftLink",
  description:
    "GiftLink Terms of Use covering purchases, gifting, claiming, payouts, and service rules.",
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

export default function TermsPage() {
  const lastUpdated = "December 7, 2025";

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px 420px at 18% 8%, rgba(16,185,129,0.10), rgba(255,255,255,0)) , radial-gradient(850px 420px at 78% 18%, rgba(59,130,246,0.10), rgba(255,255,255,0)) , #ffffff",
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
            Terms of Use
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
            These Terms of Use govern your access to and use of GiftLink. By
            using our website or services, purchasing GiftLink cards, funding a
            gift, or requesting a payout, you agree to these Terms.
          </p>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Contents</div>
            <div style={{ display: "grid", gap: 8 }}>
              <AnchorLink href="#about">1. About GiftLink</AnchorLink>
              <AnchorLink href="#eligibility">2. Eligibility</AnchorLink>
              <AnchorLink href="#howitworks">3. How GiftLink Works</AnchorLink>
              <AnchorLink href="#purchases">4. Purchases, Pricing, Shipping</AnchorLink>
              <AnchorLink href="#funding">5. Funding a Gift</AnchorLink>
              <AnchorLink href="#claiming">6. Claiming and Payout Requests</AnchorLink>
              <AnchorLink href="#prohibited">7. Prohibited Use</AnchorLink>
              <AnchorLink href="#thirdparties">8. Third Party Services</AnchorLink>
              <AnchorLink href="#content">9. User Content and Messages</AnchorLink>
              <AnchorLink href="#disclaimer">10. Disclaimers</AnchorLink>
              <AnchorLink href="#liability">11. Limitation of Liability</AnchorLink>
              <AnchorLink href="#termination">12. Termination</AnchorLink>
              <AnchorLink href="#changes">13. Changes</AnchorLink>
              <AnchorLink href="#contact">14. Contact</AnchorLink>
            </div>
          </div>
        </Card>

        <section id="about" style={{ marginTop: 26 }}>
          <h2 style={sectionTitleStyle}>1. About GiftLink</h2>
          <p style={paragraphStyle}>
            GiftLink provides physical greeting cards that include a unique QR
            code. The QR code links to a webpage where a gift can be funded by a
            gifter and later claimed by a recipient. GiftLink, LLC is a company
            organized in North Carolina, United States.
          </p>
        </section>

        <section id="eligibility">
          <h2 style={sectionTitleStyle}>2. Eligibility</h2>
          <p style={paragraphStyle}>
            You must be able to form a binding contract in your jurisdiction to
            use GiftLink. You represent that the information you provide is
            accurate and that you will comply with these Terms and applicable
            laws.
          </p>
        </section>

        <section id="howitworks">
          <h2 style={sectionTitleStyle}>3. How GiftLink Works</h2>
          <p style={paragraphStyle}>
            GiftLink is designed to support two phases using the same QR code:
          </p>
          <ol style={{ ...paragraphStyle, paddingLeft: 20 }}>
            <li>
              Funding. A gifter scans the QR code, enters gift details, and
              completes payment using our checkout flow.
            </li>
            <li>
              Claiming. The recipient scans the same QR code, provides required
              information, and submits a payout request.
            </li>
          </ol>
          <p style={paragraphStyle}>
            GiftLink uses internal status tracking to help prevent duplicate
            claims and to support reconciliation, support, and fraud prevention.
          </p>
        </section>

        <section id="purchases">
          <h2 style={sectionTitleStyle}>4. Purchases, Pricing, Shipping</h2>
          <p style={paragraphStyle}>
            If you purchase physical GiftLink cards or packs, pricing, shipping,
            taxes, and availability will be shown at checkout. Delivery times
            may vary. If a product is unavailable or a fulfillment issue occurs,
            we may contact you to resolve it.
          </p>
          <p style={paragraphStyle}>
            Refund policies for physical goods may differ from policies for
            funded gifts. If you need help, contact us using the information
            below.
          </p>
        </section>

        <section id="funding">
          <h2 style={sectionTitleStyle}>5. Funding a Gift</h2>
          <p style={paragraphStyle}>
            Funding a gift is processed through a payment provider. By funding a
            gift, you authorize the payment and you agree to comply with the
            payment provider terms that apply to your transaction.
          </p>
          <p style={paragraphStyle}>
            We may delay or refuse a transaction if we believe it is suspicious,
            fraudulent, or violates these Terms or applicable law.
          </p>
        </section>

        <section id="claiming">
          <h2 style={sectionTitleStyle}>6. Claiming and Payout Requests</h2>
          <p style={paragraphStyle}>
            To claim a gift, a recipient may be asked to provide contact details
            and payout information. Payout methods may vary over time. Payouts
            may be subject to verification, review, or additional information
            requests to reduce fraud and comply with legal obligations.
          </p>
          <p style={paragraphStyle}>
            We are not responsible for delays, denials, or outages caused by
            third party payout networks or providers. If a payout cannot be
            completed due to incorrect recipient information, we may request
            updated information.
          </p>
        </section>

        <section id="prohibited">
          <h2 style={sectionTitleStyle}>7. Prohibited Use</h2>
          <p style={paragraphStyle}>
            You agree not to misuse GiftLink. Prohibited conduct includes:
          </p>
          <ol style={{ ...paragraphStyle, paddingLeft: 20 }}>
            <li>Attempting to claim gifts you are not entitled to claim.</li>
            <li>Fraud, deception, or impersonation.</li>
            <li>Using GiftLink for illegal activity or prohibited transactions.</li>
            <li>Interfering with the security or operation of the service.</li>
          </ol>
        </section>

        <section id="thirdparties">
          <h2 style={sectionTitleStyle}>8. Third Party Services</h2>
          <p style={paragraphStyle}>
            GiftLink may rely on third party services for payments, hosting,
            fulfillment, messaging, and analytics. Those providers may have
            their own terms and policies. We do not control third party services
            and are not responsible for their performance.
          </p>
        </section>

        <section id="content">
          <h2 style={sectionTitleStyle}>9. User Content and Messages</h2>
          <p style={paragraphStyle}>
            GiftLink may allow gifters to include names and messages with a gift.
            You are responsible for the content you submit. You agree not to
            submit content that is unlawful, abusive, or infringes the rights of
            others.
          </p>
        </section>

        <section id="disclaimer">
          <h2 style={sectionTitleStyle}>10. Disclaimers</h2>
          <p style={paragraphStyle}>
            GiftLink is provided on an as is and as available basis. We make no
            warranties of any kind, express or implied, including warranties of
            merchantability, fitness for a particular purpose, and
            noninfringement, to the extent permitted by law.
          </p>
        </section>

        <section id="liability">
          <h2 style={sectionTitleStyle}>11. Limitation of Liability</h2>
          <p style={paragraphStyle}>
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
          <h2 style={sectionTitleStyle}>12. Termination</h2>
          <p style={paragraphStyle}>
            We may suspend or terminate access to the service if we reasonably
            believe you have violated these Terms or if doing so is necessary to
            protect GiftLink, users, or third parties.
          </p>
        </section>

        <section id="changes">
          <h2 style={sectionTitleStyle}>13. Changes</h2>
          <p style={paragraphStyle}>
            We may update these Terms from time to time. The updated date at the
            top of this page indicates when changes were made. Continued use of
            GiftLink after changes become effective means you accept the updated
            Terms.
          </p>
        </section>

        <section id="contact" style={{ marginBottom: 40 }}>
          <h2 style={sectionTitleStyle}>14. Contact</h2>
          <p style={paragraphStyle}>
            Questions about these Terms can be sent to{" "}
            <a
              href="mailto:admin@giftlink.cards"
              style={{
                color: "rgba(0,0,0,0.82)",
                textDecoration: "none",
                borderBottom: "1px solid rgba(0,0,0,0.18)",
                paddingBottom: 1,
              }}
            >
              admin@giftlink.cards
            </a>
            .
          </p>
        </section>

        <div style={{ ...smallStyle, marginTop: 10 }}>
          Tip: link your footer Terms to this page at /terms.
        </div>
      </div>
    </main>
  );
}
