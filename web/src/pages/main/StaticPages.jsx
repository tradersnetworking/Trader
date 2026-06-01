import { Link } from "react-router-dom";

export function StaticPage({ title, children }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-navy">{title}</h1>
      <div className="prose prose-sm mt-6 max-w-none space-y-4 text-slate-600 dark:text-slate-300">{children}</div>
    </div>
  );
}

export function AboutUs() {
  return (
    <StaticPage title="About Us">
      <p><strong>Akshaya Exim Traders</strong> is a global export–import company specialising in agricultural products, food grains, FMCG goods, essential oils, ayurvedic powders, dry fruits, veterinary feed, medical supplies, metals, chemicals, machinery, textiles and industrial goods.</p>
      <p>We serve both <strong>B2B</strong> buyers and sellers across India and international markets, and <strong>B2C</strong> buyers within India. Our platform connects verified suppliers with bulk buyers and helps importers source required products efficiently.</p>
      <h2 className="text-xl font-bold text-navy">What We Do</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Export-grade product listings across agriculture, metals, chemicals, medical and pharmaceutical categories</li>
        <li>Import requirement listings for bulk procurement</li>
        <li>Instant quote requests (RFQ) for buyers and supply offers from sellers</li>
        <li>Secure payments via UPI, bank transfer, cards and multiple gateways</li>
        <li>End-to-end support for documentation, logistics coordination and quality assurance</li>
      </ul>
      <h2 className="text-xl font-bold text-navy">Our Mission</h2>
      <p>To make global trade accessible, transparent and reliable for businesses of every size — from farmers and MSMEs to large corporates.</p>
      <p>Domains: <a href="https://akshayaexim.com" className="text-navy underline">akshayaexim.com</a> · <a href="https://akshayaexim.in" className="text-navy underline">akshayaexim.in</a></p>
    </StaticPage>
  );
}

export function PrivacyPolicy() {
  return (
    <StaticPage title="Privacy Policy">
      <p>Last updated: {new Date().toLocaleDateString("en-IN")}</p>
      <p>Akshaya Exim Traders ("we", "us") respects your privacy. This policy explains how we collect, use and protect your information on akshayaexim.com and akshayaexim.in.</p>
      <h2 className="text-xl font-bold text-navy">Information We Collect</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Account details: name, email, phone, company name, GST number (B2B)</li>
        <li>Trade data: quote requests, orders, product listings, messages</li>
        <li>Payment information processed via secure third-party gateways (we do not store full card numbers)</li>
        <li>Technical data: IP address, browser type, cookies for session management</li>
      </ul>
      <h2 className="text-xl font-bold text-navy">How We Use Your Data</h2>
      <p>To process quotes and orders, communicate about trades, improve our platform, comply with legal obligations and prevent fraud.</p>
      <h2 className="text-xl font-bold text-navy">Data Sharing</h2>
      <p>We share data only with payment processors, logistics partners (when needed for your order) and as required by law. We never sell your personal data.</p>
      <h2 className="text-xl font-bold text-navy">Your Rights</h2>
      <p>You may request access, correction or deletion of your data by contacting us at <a href="mailto:privacy@akshayaexim.com" className="text-navy underline">privacy@akshayaexim.com</a>.</p>
    </StaticPage>
  );
}

export function ReturnsRefund() {
  return (
    <StaticPage title="Returns & Refund Policy">
      <p>Akshaya Exim Traders deals in bulk B2B and B2C trade. Returns and refunds are governed by the terms agreed in your quote or purchase order.</p>
      <h2 className="text-xl font-bold text-navy">General Policy</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Quality issues:</strong> Report within 48 hours of delivery with photographic evidence. We will inspect and arrange replacement or partial refund.</li>
        <li><strong>Wrong product:</strong> Full refund or correct product reshipment at our cost if reported within 24 hours.</li>
        <li><strong>Custom / bulk orders:</strong> Non-returnable once production or shipment has commenced unless mutually agreed.</li>
        <li><strong>Import orders:</strong> Subject to Incoterms agreed in the contract (FOB, CIF, etc.).</li>
      </ul>
      <h2 className="text-xl font-bold text-navy">Refund Timeline</h2>
      <p>Approved refunds are processed within 7–14 business days to the original payment method or bank account.</p>
      <h2 className="text-xl font-bold text-navy">Contact</h2>
      <p>For return requests email <a href="mailto:support@akshayaexim.com" className="text-navy underline">support@akshayaexim.com</a> with your order/quote reference.</p>
    </StaticPage>
  );
}

export function TermsOfService() {
  return (
    <StaticPage title="Terms of Service">
      <p>By using akshayaexim.com or akshayaexim.in you agree to these terms.</p>
      <h2 className="text-xl font-bold text-navy">Platform Use</h2>
      <p>The platform connects buyers and sellers. Akshaya Exim Traders facilitates quotes and transactions but individual trade terms are confirmed per order/quote.</p>
      <h2 className="text-xl font-bold text-navy">Account Responsibilities</h2>
      <p>You are responsible for accurate listings, lawful products and keeping login credentials secure. Misrepresentation or illegal goods will result in account suspension.</p>
      <h2 className="text-xl font-bold text-navy">Pricing & Quotes</h2>
      <p>Listed prices are indicative for bulk trade. Final pricing is confirmed upon quote acceptance. Prices may change based on market conditions.</p>
      <h2 className="text-xl font-bold text-navy">Limitation of Liability</h2>
      <p>We are not liable for indirect losses. Our liability is limited to the value of the specific transaction in dispute.</p>
    </StaticPage>
  );
}

export function ContactUs() {
  return (
    <StaticPage title="Contact Us">
      <p>Reach our trade desk for export, import, bulk quotes and supplier partnerships.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["General Enquiries", "info@akshayaexim.com", "+91 98765 43210"],
          ["Export Desk", "export@akshayaexim.com", "+91 98765 43211"],
          ["Import Desk", "import@akshayaexim.com", "+91 98765 43212"],
          ["Support", "support@akshayaexim.com", "+91 98765 43213"],
        ].map(([t, e, p]) => (
          <div key={t} className="card p-4">
            <h3 className="font-bold text-navy">{t}</h3>
            <p className="mt-1 text-sm"><a href={`mailto:${e}`} className="text-navy underline">{e}</a></p>
            <p className="text-sm text-slate-500">{p}</p>
          </div>
        ))}
      </div>
      <h2 className="text-xl font-bold text-navy">Office</h2>
      <p>Akshaya Exim Traders<br />Mumbai, Maharashtra, India<br />Mon–Sat, 9:00 AM – 7:00 PM IST</p>
    </StaticPage>
  );
}

export function FaqPage() {
  return (
    <StaticPage title="FAQ">
      {[
        ["How do I request a quote?", "Browse products, click Request Quote, fill quantity and contact details. Our team responds within 24 hours."],
        ["What is the minimum order quantity?", "Varies by product — shown on each listing. Bulk B2B orders typically start from listed MOQ."],
        ["Do you ship internationally?", "Yes. We export globally and facilitate imports. Shipping terms are agreed per quote."],
        ["How can I list my products?", "Register as B2B seller, or use Supply / Sell to submit a bulk supply offer."],
        ["What payment methods are accepted?", "UPI, IMPS, NEFT, RTGS, cards (Visa, Mastercard, RuPay), e-wallets and payment gateways."],
      ].map(([q, a]) => (
        <div key={q} className="card p-4">
          <h3 className="font-bold text-navy">{q}</h3>
          <p className="mt-1 text-sm">{a}</p>
        </div>
      ))}
    </StaticPage>
  );
}
