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

- **Marketplace (main):** `/` — products, login, dashboard
- **Invest portal (local only):** `/invest` — plans, investor login, dashboard

In **production**, each domain is separate:

| Domain | Routes |
| --- | --- |
| `akshayaexim.com` / `.in` | `/`, `/products`, `/login`, `/dashboard`, … |
| `invest.akshayaexim.com` / `.in` | `/`, `/login`, `/dashboard`, `/admin`, … (no `/invest` prefix) |

Visiting `/invest` on the main domain redirects to the invest subdomain. The app detects the hostname and loads only the matching portal (separate routes, auth, and theme).

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

## Investment Plans
Lock-in is always a multiple of 30 days. **Monthly ROI depends on lock-in length** (same in every capital tier). **Min/max investment** depends on category:

| Category | Investment range |
| --- | --- |
| Starter | ₹1 – 5 Lakhs |
| Bronze | ₹6 – 10 Lakhs |
| Silver | ₹11 – 15 Lakhs |
| Gold | ₹16 – 30 Lakhs |
| Platinum | ₹31 – 50 Lakhs |
| Diamond | Above ₹50 Lakhs |

| Lock-in | Monthly ROI | Annual ROI (×12) |
| --- | --- | --- |
| 1 month | 15% | 180% |
| 3 months | 16% | 192% |
| 6 months | 17% | 204% |
| 9 months | 18% | 216% |
| 12 months | 19% | 228% |
| 24 months | 20% | 240% |
| 36 months | 22% | 264% |

6 categories × 7 lock-in options = **42 plans**. Annual ROI is monthly × 12. **Compounding applies only after lock-in completes.** Edit plans in Super Admin → Investment Plans; run `npm run seed` in `server/` to sync the matrix to the database.

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
