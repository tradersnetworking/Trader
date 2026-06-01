/** Full Private Investment & Profit Sharing Agreement — default template with {{SHORTCODE}} placeholders. */

export const PRIVATE_INVESTMENT_AGREEMENT = {
  type: "investment",
  title: "PRIVATE INVESTMENT & PROFIT SHARING AGREEMENT",
  sections: [
    {
      heading: "PARTIES & EXECUTION",
      body: `PRIVATE INVESTMENT & PROFIT SHARING AGREEMENT FOR PARTIES

This Private Investment & Profit Sharing Agreement ("Agreement") is executed on this {{AGREEMENT_DAY}} day of {{AGREEMENT_MONTH}} {{AGREEMENT_YEAR}}.

BETWEEN

COMPANY / FIRM / LLP : {{COMPANY_LEGAL_NAME}}
A Registered {{COMPANY_TYPE}} with
Registration No: {{COMPANY_REGISTRATION_NO}}  PAN: {{COMPANY_PAN}}
Registered office: {{COMPANY_REGISTERED_OFFICE}}
Email address: {{COMPANY_EMAIL}}
Website: {{COMPANY_WEBSITE}}
Represented by its Authorized Representative:
Name: {{COMPANY_REP_NAME}}
Designation: {{COMPANY_REP_DESIGNATION}}.

AND

Investor — hereinafter referred to as the "Investor".

Fund Manager / Company:					Investor:
Name: {{COMPANY_REP_NAME}}				Name: {{FULL_NAME}}
Father's Name: {{COMPANY_REP_FATHER_NAME}}		Father's Name: {{FATHER_NAME}}
PAN Number: {{COMPANY_PAN}}				PAN Number: {{PAN_NUMBER}}
Aadhaar Number: —					Aadhaar Number: {{AADHAAR_NUMBER}}
Address: {{COMPANY_REGISTERED_OFFICE}}		Address: {{FULL_ADDRESS}}
Phone Number: —					Phone Number: {{MOBILE}}
Email ID: {{COMPANY_EMAIL}}				Email ID: {{EMAIL}}
Hereinafter referred to as the "Fund Manager"	Hereinafter referred to as the "Investor"
Signature & Date: _________________________	Signature & Date: _________________________

The Authorized Representative / Director / Fund Manager and the Investor are individually referred to as a "Party" and collectively referred to as the "Parties".`,
    },
    {
      heading: "1. PURPOSE OF AGREEMENT",
      body: `The Investor agrees to provide private investment capital to the Company for the purpose of supporting the Company's lawful activities including but not limited to:
Financial technology services
Agriculture based Services
Software and technology services
Loan facilitation services
Business consulting
Microfinance facilitation
Digital platform operations
Other lawful commercial activities undertaken by the Company.

The Company agrees to utilize the funds solely for lawful operational, development, technology, microfinance facilitation, and other permitted commercial activities in accordance with applicable Indian laws, Rules and regulations.`,
    },
    {
      heading: "2. INVESTMENT AMOUNT & BANK DETAILS",
      body: `The Investor agrees to invest a sum of: {{INVESTMENT_AMOUNT}}
({{INVESTMENT_AMOUNT_WORDS}} — Rupees only)

The amount shall be transferred through banking channels only to the Fund Manager's / Company's official bank account.

Fund Manager's / Company's Bank Details:			Investor's Bank Details:
Bank Name: {{COMPANY_BANK_NAME}}			Bank Name: {{BANK_NAME}}
Branch: {{COMPANY_BANK_BRANCH}}				Branch: {{BRANCH_NAME}}
Account Name: {{COMPANY_BANK_ACCOUNT_NAME}}		Account Name: {{BANK_ACCOUNT_NAME}}
Account Number: {{COMPANY_BANK_ACCOUNT}}		Account Number: {{BANK_ACCOUNT}}
IFSC Code: {{COMPANY_BANK_IFSC}}			IFSC Code: {{IFSC_CODE}}
MICR Code: {{COMPANY_BANK_MICR}}			MICR Code: {{INVESTOR_MICR}}
SWIFT Code: {{COMPANY_BANK_SWIFT}}			SWIFT Code: {{INVESTOR_SWIFT}}`,
    },
    {
      heading: "3. NATURE OF INVESTMENT",
      body: `The Parties agree that:
The investment made under this Agreement is a private business investment.
The investment is not a public deposit scheme.
The Company does not guarantee fixed returns or assured profits.
Returns, if any, shall depend upon the actual performance and profitability of the business.
The Investor acknowledges that all business activities involve risk.
The Investor confirms that the investment is made voluntarily after understanding the associated risks.`,
    },
    {
      heading: "4. PROFIT SHARING",
      body: `Subject to the profitability and financial performance of the Company, the Investor may receive a profit share.
The profit share percentage shall be: {{PROFIT_SHARE_PCT}}% of the total investment made by the Investor.
Profit distribution may be made: {{PROFIT_DISTRIBUTION_CYCLE}} (as decided mutually by the Parties)
Profit distributions shall be made only through bank transfer.
The Company reserves the right to retain profits for operational, compliance, expansion, reserve, or business purposes.`,
    },
    {
      heading: "5. TENURE OF INVESTMENT",
      body: `The investment is made under this plan {{PLAN_NAME}} and lock-in period of plan under this Agreement shall be: {{LOCK_IN_MONTHS}} Months ({{LOCK_IN_YEARS}} Years) commencing from the date of receipt of funds by the Fund Manager, and will be the locked-in period.
Start Date: {{START_DATE}} | Maturity Date: {{MATURITY_DATE}}
Projected Maturity Value: {{MATURITY_VALUE}} | Monthly ROI: {{MONTHLY_ROI}} | Annual ROI: {{ANNUAL_ROI}}`,
    },
    {
      heading: "6. WITHDRAWAL & EXIT",
      body: `The Investor may request withdrawal of investment by providing written notice of {{WITHDRAWAL_NOTICE_DAYS}} days.
The Company shall make reasonable efforts to process the withdrawal subject to:
Business liquidity
Outstanding obligations
Ongoing operational commitments
The Company may repay the investment in full or in installments.
Early withdrawal terms, if any, shall be mutually decided.`,
    },
    {
      heading: "7–13. OBLIGATIONS, RISK, CONFIDENTIALITY, COMPLIANCE, TAXATION & NO PARTNERSHIP",
      body: `7. FUND MANAGER OBLIGATIONS — The Fund Manager agrees to maintain proper books of accounts; utilize funds for lawful business activities only; comply with applicable laws; maintain transparency; provide periodic updates; and maintain confidentiality of investor information.

8. INVESTOR DOCUMENT REQUIREMENTS — Self-attested Aadhaar, PAN, cancelled cheque, passport-size photograph (if required), and any additional KYC documents. KYC Status: {{KYC_STATUS}}.

9. RISK DISCLOSURE — Business activities involve financial risks. Market fluctuations, operational losses, regulatory changes, economic conditions, or unforeseen circumstances may impact profitability. Past performance does not guarantee future performance.

10. CONFIDENTIALITY — Both Parties agree to maintain confidentiality regarding business, financial, client, operational, trade secret, and investor information unless disclosure is required by law.

11. COMPLIANCE WITH LAW — Governed by Societies Registration Act, Indian Contract Act 1872, Income Tax Act 1961, applicable RBI guidelines, SEBI regulations (where applicable), and other Indian laws.

12. TAXATION — Applicable taxes borne as per law. TDS may be deducted. Investor responsible for declaring income.

13. NO PARTNERSHIP — Nothing creates partnership, employment, agency, or joint venture unless agreed in writing.`,
    },
    {
      heading: "14–16. DISPUTE RESOLUTION, TERMINATION & ENTIRE AGREEMENT",
      body: `14. DISPUTE RESOLUTION — Disputes resolved amicably first, then arbitration under the Arbitration and Conciliation Act, 1996. Jurisdiction: {{JURISDICTION}}.

15. TERMINATION — By mutual consent; upon completion of tenure; material breach; or unlawful activities.

16. ENTIRE AGREEMENT — Complete understanding between Parties. Modifications valid only in writing signed by both Parties.`,
    },
    {
      heading: "17. INVESTOR DECLARATION",
      body: `I, the undersigned Investor ({{FULL_NAME}}), hereby declare that:
I have read and understood the terms and conditions of this Agreement.
I am voluntarily investing funds with the Company.
The funds invested by me are from lawful sources.
I understand that business activities involve financial risks and that profits are not guaranteed.
I agree to comply with the terms of this Agreement and applicable laws.
I confirm that all documents and information submitted by me are true and genuine.`,
    },
    {
      heading: "18. SIGNATURES & WITNESSES",
      body: `Fund Manager:						Investor:
Name: {{COMPANY_REP_NAME}}				Name: {{FULL_NAME}}
Signature & Date: _________________________		Signature & Date: _________________________

WITNESSES
Witness 1:							Witness 2:
Name: __________________________________		Name: _________________________________
Signature & Date: _________________________		Signature & Date: _________________________

IMPORTANT LEGAL NOTE
The Fund Manager / Company ensures that activities do not violate RBI regulations; no unlawful public deposit scheme is operated; no guaranteed public investment scheme is advertised; all funds are properly accounted for; and all investor/member records are maintained.

Agreement Reference: {{AGREEMENT_UID}} | Date: {{AGREEMENT_DATE}} | Subscription: {{SUBSCRIPTION_ID}} | Plan: {{PLAN_NAME}} ({{PLAN_TYPE}})`,
    },
  ],
};
