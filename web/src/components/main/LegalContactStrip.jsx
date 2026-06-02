import { Link } from "react-router-dom";
import {
  MAIN_SUPPORT_EMAIL,
  MAIN_SUPPORT_PHONE,
  MAIN_SUPPORT_PHONE_TEL,
} from "../../lib/mainContact.js";

/** Shown on policy/legal pages — helps payment gateway merchant verification. */
export default function LegalContactStrip() {
  return (
    <div className="mt-8 rounded-xl border border-border bg-muted/30 p-5 text-sm not-prose">
      <h2 className="text-lg font-bold text-navy dark:text-white">Business contact</h2>
      <p className="mt-2 text-muted-foreground">
        <strong>Akshaya Exim Traders</strong> · akshayaexim.com · akshayaexim.in
      </p>
      <ul className="mt-3 space-y-1">
        <li>
          Phone:{" "}
          <a href={`tel:${MAIN_SUPPORT_PHONE_TEL}`} className="font-semibold text-navy underline dark:text-gold">
            {MAIN_SUPPORT_PHONE}
          </a>
        </li>
        <li>
          Email:{" "}
          <a href={`mailto:${MAIN_SUPPORT_EMAIL}`} className="text-navy underline dark:text-gold">
            {MAIN_SUPPORT_EMAIL}
          </a>
        </li>
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Policies:{" "}
        <Link to="/about" className="underline">About</Link>
        {" · "}
        <Link to="/contact" className="underline">Contact</Link>
        {" · "}
        <Link to="/privacy" className="underline">Privacy</Link>
        {" · "}
        <Link to="/terms" className="underline">Terms</Link>
        {" · "}
        <Link to="/returns" className="underline">Returns & Refunds</Link>
        {" · "}
        <Link to="/faq" className="underline">FAQ</Link>
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Online payments: UPI, bank transfer, and card gateways (Razorpay, Cashfree, PayU, etc.) as shown at checkout.
      </p>
    </div>
  );
}
