import { Link } from "react-router-dom";
import { investPath } from "../../lib/site.js";

export function InvestRiskDisclosure() {
  return (
    <LegalPage title="Risk Disclosure">
      <p>Investments in AKSHYA INVESTMENTS plans carry market, liquidity, and operational risks. Past performance does not guarantee future returns.</p>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li>Capital is subject to lock-in periods as per your chosen plan.</li>
        <li>ROI projections are indicative and may vary based on business performance.</li>
        <li>Early withdrawal may not be permitted before maturity unless stated in your agreement.</li>
        <li>Ensure you complete KYC and read all agreements before investing.</li>
      </ul>
    </LegalPage>
  );
}

export function InvestTermsOfService() {
  return (
    <LegalPage title="Terms of Service">
      <p>By using invest.akshayaexim.com you agree to these terms governing your investor account, deposits, withdrawals, and plan subscriptions.</p>
      <p className="mt-3">You must provide accurate KYC information, maintain account security (including 2FA when enabled), and comply with applicable Indian laws.</p>
      <p className="mt-3">AKSHYA INVESTMENTS may suspend accounts for fraud, AML concerns, or violation of platform policies.</p>
    </LegalPage>
  );
}

export function InvestPrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>We collect personal data for KYC, account management, and regulatory compliance. Data is stored securely and not sold to third parties.</p>
      <p className="mt-3">For data access or deletion requests contact <a href="mailto:support@akshayaexim.com" className="text-primary underline">support@akshayaexim.com</a>.</p>
    </LegalPage>
  );
}

export function InvestAmlPolicy() {
  return (
    <LegalPage title="AML / KYC Policy">
      <p>All investors must complete Know Your Customer (KYC) verification before investing. We verify identity, address, and banking details in line with AML guidelines.</p>
      <p className="mt-3">Suspicious activity may be reported to authorities. False or misleading KYC information will result in account suspension.</p>
    </LegalPage>
  );
}

export function InvestCookiePolicy() {
  return (
    <LegalPage title="Cookie Policy" lastUpdated="June 2026">
      <section className="space-y-4">
        <h2 className="text-lg font-bold">1. What Are Cookies</h2>
        <p>Cookies are small text files stored on your device when you visit invest.akshayaexim.com. They help maintain your login session, remember theme and language preferences, and keep the invest portal secure.</p>

        <h2 className="text-lg font-bold">2. Cookies We Use</h2>
        <h3 className="font-semibold">Strictly Necessary</h3>
        <div className="app-table-wrap">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Purpose</th>
                <th className="py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4 font-mono text-xs text-amber-600">aex_invest_token</td>
                <td className="py-2 pr-4">Maintains your authenticated investor session (local storage)</td>
                <td className="py-2">Until logout</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-semibold">Functional</h3>
        <div className="app-table-wrap">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Purpose</th>
                <th className="py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4 font-mono text-xs text-amber-600">aex_theme_invest</td>
                <td className="py-2 pr-4">Light, dark, or system theme preference</td>
                <td className="py-2">1 year</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4 font-mono text-xs text-amber-600">aex_locale</td>
                <td className="py-2 pr-4">Language preference</td>
                <td className="py-2">1 year</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4 font-mono text-xs text-amber-600">invest_ref</td>
                <td className="py-2 pr-4">Referral code during registration</td>
                <td className="py-2">Session</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-bold">3. Managing Cookies</h2>
        <p>You can clear site data from your browser settings. Disabling essential storage will prevent you from staying logged in to the invest portal.</p>
        <p>For questions contact <a href="mailto:support@akshayaexim.com" className="text-primary underline">support@akshayaexim.com</a>.</p>
      </section>
    </LegalPage>
  );
}

function LegalPage({ title, children, lastUpdated }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to={investPath("")} className="text-sm font-semibold text-primary hover:underline">← Back to Home</Link>
      <h1 className="page-title mt-4">{title}</h1>
      {lastUpdated && <p className="mt-1 text-xs text-muted-foreground">Last updated: {lastUpdated}</p>}
      <div className="prose prose-slate mt-6 max-w-none text-sm leading-relaxed dark:prose-invert">{children}</div>
    </div>
  );
}
