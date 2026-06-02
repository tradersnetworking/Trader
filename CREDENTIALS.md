# Login Credentials — Akshaya Exim Traders

> **Change all passwords before going to production.**

### VPS / production

- **Existing super admin and admin passwords are never changed** by `npm run seed` or deploy entrypoint (accounts are create-if-missing only).
- On VPS after deploy, sync plans with: `npm run seed:plans` (invest DB only, no staff accounts).
- Keep production passwords in server `.env` only for **new** installs; do not re-run full seed expecting defaults to apply to existing users.

---

## Marketplace — `akshayaexim.com` / `akshayaexim.in`

| Role | Email | Password | Login URL | Dashboard |
|------|-------|----------|-----------|-----------|
| **Super Admin** | `superadmin@akshayaexim.com` | `Admin@12345` | `/staff-login` | `/admin` |
| **Admin** | `admin@akshayaexim.com` | `Admin@12345` | `/staff-login` | `/admin` |
| **Demo User (B2B Buyer)** | `user@akshayaexim.com` | `User@123` | `/login` | `/dashboard` |

**Notes:**
- Super Admin can create Staff/Admin accounts, manage all products, categories, quotes and user roles.
- Admin can manage products, categories, quotes and respond to RFQs.
- Staff login page rejects regular user accounts.
- Users register at `/register` for B2B or B2C accounts.

---

## Invest Portal — `invest.akshayaexim.com` / `invest.akshayaexim.in`

| Role | Email | Password | Login URL | Dashboard |
|------|-------|----------|-----------|-----------|
| **Super Admin** | `superadmin@akshayaexim.com` | `Admin@12345` | `/invest/staff-login` | `/invest/admin` |
| **Admin** | `admin@akshayaexim.com` | `Admin@12345` | `/invest/staff-login` | `/invest/admin` |
| **Demo Investor** | `investor@akshayaexim.com` | `Investor@123` | `/invest/login` | `/invest/dashboard` |

**Notes:**
- Super Admin can create/edit/delete investment plans, create admin accounts, approve KYC & deposits, release payouts.
- Admin can approve deposits, KYC, and release payouts (cannot manage plans).
- Demo investor has ₹1,00,000 wallet balance and approved KYC for testing subscriptions.
- Investors register at `/invest/register`.

---

## Quick Access (Local Dev)

```powershell
npm run dev
# Marketplace:  http://localhost:5173
# Invest:       http://localhost:5173/invest
# API:          http://localhost:4000
```

Re-seed databases:

```powershell
npm run seed
```
