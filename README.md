# Akshaya Exim Traders — Marketplace + Investor Portal

A full-stack platform for **Akshaya Exim Traders** covering two products:

| Portal | Domains | Purpose |
| --- | --- | --- |
| **Marketplace** | `akshayaexim.com` / `akshayaexim.in` | Export/Import listings, categories, B2B & B2C quotes (RFQ), orders, payments |
| **Investor Portal** | `invest.akshayaexim.com` / `invest.akshayaexim.in` | Investment plans, wallet/ledger, KYC, deposits, payouts |

The two portals use **separate databases** (`server/main.db` and `server/invest.db`) and **separate auth tokens**, exactly as required.

---

## Tech Stack
- **Backend:** Node.js + Express, Prisma ORM, SQLite (two databases), JWT auth, Nodemailer (SMTP), Multer uploads.
- **Frontend:** React (Vite) + Tailwind CSS + React Router.
- **Payments (collection):** Razorpay, Cashfree, PayU, Juspay, EximPe, UPI — unified adapter (mock mode until keys are added).
- **Payouts (disbursement):** RazorpayX, Cashfree Payouts.

---

## Quick Start (Windows / PowerShell)

```powershell
# from the project root
npm install
npm --workspace server install
npm --workspace web install

# create the two databases + Prisma clients, then seed
npm run setup
npm run seed

# run backend (4000) + frontend (5173) together
npm run dev
```

Then open **http://localhost:5173**

- Marketplace: `/`
- Investor portal: `/invest`

> In production, point `akshayaexim.com` at the SPA root and `invest.akshayaexim.com` at `/invest`. The frontend also detects host names.

---

## Seeded Accounts

| Role | Email | Password | Where |
| --- | --- | --- | --- |
| Super Admin | `superadmin@akshayaexim.com` | `Admin@12345` | both portals |
| Admin | `admin@akshayaexim.com` | `Admin@12345` | both portals |
| Demo Investor | `investor@akshayaexim.com` | `Investor@123` | invest portal (₹1,00,000 wallet, KYC approved) |

**Access rules**
- **Super Admin** can access both the main-domain and invest-subdomain admin dashboards, and is the only role that can create/edit/delete investment plans and create staff/admin accounts.
- **Admin** (invest) can manage deposits & KYC and **release payouts**, but cannot manage plans.
- Users/Investors get their own dashboards.

---

## Login Pages
Each portal has: **User login**, **Staff/Admin login** (button below user login), **Register**, **Forgot password**, **Reset password**, and **Google login** (enable by setting `VITE_GOOGLE_CLIENT_ID` for the web app and `GOOGLE_CLIENT_ID` for the server).

---

## Investment Plans (from the brochure)
Seeded plan tiers (lock-in is always a multiple of 30 days):

| Plan | Lock-in | Monthly ROI | Annual ROI |
| --- | --- | --- | --- |
| Starter | 30 days | 10% | 120% |
| Bronze | 90 days | 12% | 144% |
| Silver | 180 days | 15% | 180% |
| Gold | 360 days* | 17% | 204% |
| Platinum | 720 days | 19% | 228% |
| Diamond | 1080 days | 20% | 240% |

\* The brochure shows 365 days for Gold; we use 360 so every lock-in stays a multiple of 30 (per requirement). Edit any plan from the Super Admin dashboard.

When a Super Admin creates a plan they choose: **plan type (dropdown)**, **lock-in period**, **min/max investment**, and **profit share % per month**. Annual ROI is auto-computed (monthly × 12). **Compounding is applied only after the lock-in period completes.**

---

## Configuration
Copy `server/.env.example` to `server/.env` and fill in real values when ready:
- **SMTP**: set host/user/pass for real emails. If empty, reset/verification links are printed to the server console (dev mode).
- **Payment gateways**: add keys to switch any adapter from mock to live.
- **Payouts**: add RazorpayX / Cashfree payout credentials.
- **Bank details**: shown to investors for IMPS/NEFT/RTGS deposits with copy buttons.

For Google login on the frontend, create `web/.env` with:
```
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

---

## Key Flows (all verified end-to-end)
1. **Marketplace:** browse categories/sub-categories → request quote (Buy) or offer to supply (Sell) → admin responds → checkout via gateway.
2. **Deposit:** investor adds funds (online gateway or manual IMPS/NEFT/RTGS with **proof upload**) → admin **approves** → wallet credited via ledger.
3. **Invest:** investor subscribes to a plan from wallet balance (requires approved KYC) → funds move to "invested" with a ledger entry.
4. **Withdraw:** investor requests payout → funds held → admin **releases** to UPI/bank via RazorpayX/Cashfree.
5. **KYC:** investor submits PAN/Aadhaar/photo → admin approves/rejects.

---

## Project Structure
```
server/
  prisma/main.prisma      # marketplace DB schema
  prisma/invest.prisma    # investor DB schema
  src/
    routes/               # mainAuth, marketplace, investAuth, investPublic, investInvestor, investAdmin
    payments/             # gateways.js (collection), payouts.js (disbursement)
    utils/                # auth, mailer, google, upload, invest math
    seed.js               # accounts + catalog + plans
web/
  src/
    pages/main/           # Home, Products, ProductDetail, Sell, UserDashboard, AdminDashboard
    pages/invest/         # Home, InvestorDashboard, AdminDashboard
    components/           # Layouts, AuthScreens, PlanCard, SubscribeModal, QuoteModal, ui
    lib/                  # api (scoped), store (dual auth), format
```
