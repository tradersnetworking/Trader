# Platform Discovery Map

**Generated:** 2026-06-04  
**Source:** `scripts/generate-platform-discovery.mjs`

## Frontend routes (invest subdomain)

| Path | Surface |
|------|---------|
| `/` | Investor / auth / legal SPA |
| `/login` | Investor / auth / legal SPA |
| `/register` | Investor / auth / legal SPA |
| `/forgot-password` | Investor / auth / legal SPA |
| `/reset-password` | Investor / auth / legal SPA |
| `/dashboard` | Investor / auth / legal SPA |
| `/onboarding` | Investor / auth / legal SPA |
| `/admin` | Investor / auth / legal SPA |
| `/privacy` | Investor / auth / legal SPA |
| `/terms` | Investor / auth / legal SPA |
| `/risk-disclosure` | Investor / auth / legal SPA |
| `/aml-policy` | Investor / auth / legal SPA |
| `/cookie-policy` | Investor / auth / legal SPA |
| `/verify-certificate` | Investor / auth / legal SPA |
| `/ref/:code` | Investor / auth / legal SPA |

Admin tabs are driven by `web/src/lib/invest-nav.js` + `AdminDashboard.jsx` (lazy panels).

## Invest API routes (248 endpoints)

| Method | Path |
|--------|------|
| GET | `/api/invest/achievements` |
| GET | `/api/invest/admin/additional-domains` |
| POST | `/api/invest/admin/additional-domains` |
| DELETE | `/api/invest/admin/additional-domains/:id` |
| PUT | `/api/invest/admin/additional-domains/:id` |
| GET | `/api/invest/admin/agreement-company-settings` |
| PUT | `/api/invest/admin/agreement-company-settings` |
| GET | `/api/invest/admin/agreement-settings` |
| PUT | `/api/invest/admin/agreement-settings` |
| GET | `/api/invest/admin/agreement-templates` |
| PUT | `/api/invest/admin/agreement-templates/:type` |
| GET | `/api/invest/admin/agreement-templates/default/:type` |
| GET | `/api/invest/admin/agreement-templates/placeholders` |
| POST | `/api/invest/admin/agreement-templates/preview` |
| GET | `/api/invest/admin/agreements` |
| GET | `/api/invest/admin/agreements/:id/download` |
| POST | `/api/invest/admin/agreements/:id/revoke` |
| GET | `/api/invest/admin/agreements/:id/view` |
| GET | `/api/invest/admin/agreements/:id/view-url` |
| POST | `/api/invest/admin/agreements/generate` |
| GET | `/api/invest/admin/analytics/cohorts` |
| GET | `/api/invest/admin/audit-logs` |
| POST | `/api/invest/admin/credit-return` |
| GET | `/api/invest/admin/dashboard` |
| GET | `/api/invest/admin/deposits` |
| POST | `/api/invest/admin/deposits/:id/approve` |
| POST | `/api/invest/admin/deposits/:id/reject` |
| GET | `/api/invest/admin/export` |
| GET | `/api/invest/admin/export/datasets` |
| GET | `/api/invest/admin/financial-reports` |
| GET | `/api/invest/admin/gateways` |
| POST | `/api/invest/admin/import` |
| GET | `/api/invest/admin/investors` |
| GET | `/api/invest/admin/investors/:id` |
| PATCH | `/api/invest/admin/investors/:id` |
| PUT | `/api/invest/admin/investors/:id/full` |
| DELETE | `/api/invest/admin/investors/:id/kyc` |
| POST | `/api/invest/admin/investors/:id/kyc` |
| POST | `/api/invest/admin/investors/:id/reset-password` |
| POST | `/api/invest/admin/investors/:id/subscribe` |
| POST | `/api/invest/admin/investors/create-full` |
| GET | `/api/invest/admin/investors/kyc-pending` |
| POST | `/api/invest/admin/investors/kyc-pending/notify` |
| GET | `/api/invest/admin/investors/lists/kyc-pending` |
| POST | `/api/invest/admin/investors/lists/kyc-pending/notify` |
| GET | `/api/invest/admin/investors/lists/not-invested` |
| POST | `/api/invest/admin/investors/lists/not-invested/notify` |
| GET | `/api/invest/admin/investors/not-invested` |
| POST | `/api/invest/admin/investors/not-invested/email` |
| POST | `/api/invest/admin/investors/not-invested/notify` |
| GET | `/api/invest/admin/kyc` |
| GET | `/api/invest/admin/kyc-revisions` |
| POST | `/api/invest/admin/kyc-revisions/:id/decision` |
| POST | `/api/invest/admin/kyc/:id/decision` |
| POST | `/api/invest/admin/kyc/:id/final` |
| POST | `/api/invest/admin/kyc/:id/section` |
| GET | `/api/invest/admin/ledger` |
| GET | `/api/invest/admin/login-sessions` |
| POST | `/api/invest/admin/maturity-payments/:id/approve` |
| POST | `/api/invest/admin/maturity-payments/:id/reject` |
| GET | `/api/invest/admin/maturity-payments/pending` |
| GET | `/api/invest/admin/maturity-payments/today` |
| GET | `/api/invest/admin/maturity-payments/upcoming` |
| GET | `/api/invest/admin/notifications` |
| POST | `/api/invest/admin/notifications/broadcast` |
| GET | `/api/invest/admin/notifications/recent` |
| POST | `/api/invest/admin/notifications/send` |
| GET | `/api/invest/admin/partners` |
| POST | `/api/invest/admin/partners` |
| DELETE | `/api/invest/admin/partners/:id` |
| PATCH | `/api/invest/admin/partners/:id` |
| GET | `/api/invest/admin/payment-gateways` |
| POST | `/api/invest/admin/payment-gateways` |
| DELETE | `/api/invest/admin/payment-gateways/:id` |
| PATCH | `/api/invest/admin/payment-gateways/:id` |
| PUT | `/api/invest/admin/payment-mode-visibility` |
| GET | `/api/invest/admin/payout-changes` |
| POST | `/api/invest/admin/payout-changes/:id/decision` |
| GET | `/api/invest/admin/payouts` |
| POST | `/api/invest/admin/payouts/:id/cancel-scheduled` |
| POST | `/api/invest/admin/payouts/:id/mark-done` |
| POST | `/api/invest/admin/payouts/:id/reject` |
| POST | `/api/invest/admin/payouts/:id/release` |
| POST | `/api/invest/admin/payouts/direct` |
| GET | `/api/invest/admin/payouts/pending-today` |
| POST | `/api/invest/admin/payouts/schedule` |
| GET | `/api/invest/admin/permissions` |
| GET | `/api/invest/admin/plans` |
| POST | `/api/invest/admin/plans` |
| DELETE | `/api/invest/admin/plans/:id` |
| PUT | `/api/invest/admin/plans/:id` |
| GET | `/api/invest/admin/promo-codes` |
| POST | `/api/invest/admin/promo-codes` |
| DELETE | `/api/invest/admin/promo-codes/:id` |
| PATCH | `/api/invest/admin/promo-codes/:id` |
| GET | `/api/invest/admin/rbac` |
| PUT | `/api/invest/admin/rbac` |
| GET | `/api/invest/admin/rbac/admins` |
| GET | `/api/invest/admin/rbac/admins/:id` |
| PUT | `/api/invest/admin/rbac/admins/:id` |
| GET | `/api/invest/admin/referral-analytics` |
| GET | `/api/invest/admin/referral-earnings` |
| POST | `/api/invest/admin/referral-earnings/:id/pay` |
| POST | `/api/invest/admin/referral-earnings/pay-all` |
| GET | `/api/invest/admin/referral-settings` |
| PUT | `/api/invest/admin/referral-settings` |
| POST | `/api/invest/admin/roi/run` |
| GET | `/api/invest/admin/settings` |
| PUT | `/api/invest/admin/settings` |
| GET | `/api/invest/admin/settings/email-communication` |
| POST | `/api/invest/admin/settings/email-communication` |
| POST | `/api/invest/admin/settings/email-communication/test` |
| GET | `/api/invest/admin/settings/email-routing` |
| PUT | `/api/invest/admin/settings/email-routing` |
| GET | `/api/invest/admin/settings/gateways` |
| PUT | `/api/invest/admin/settings/gateways` |
| GET | `/api/invest/admin/settings/mailboxes` |
| PUT | `/api/invest/admin/settings/mailboxes` |
| POST | `/api/invest/admin/settings/mailboxes/apply-additional-domain` |
| POST | `/api/invest/admin/settings/mailboxes/provision` |
| POST | `/api/invest/admin/settings/mailboxes/revert-subdomain-email` |
| POST | `/api/invest/admin/settings/mailboxes/test` |
| POST | `/api/invest/admin/settings/telegram-test` |
| POST | `/api/invest/admin/staff` |
| GET | `/api/invest/admin/stats` |
| GET | `/api/invest/admin/subscriptions` |
| POST | `/api/invest/admin/subscriptions/:id/cancel` |
| PATCH | `/api/invest/admin/subscriptions/:id/roi` |
| GET | `/api/invest/admin/support-mail` |
| POST | `/api/invest/admin/support-mail/:id/reply` |
| POST | `/api/invest/admin/support-mail/compose` |
| POST | `/api/invest/admin/support-mail/sync` |
| GET | `/api/invest/admin/tickets` |
| POST | `/api/invest/admin/tickets/:id/close` |
| POST | `/api/invest/admin/tickets/:id/reply` |
| GET | `/api/invest/admin/treasury` |
| POST | `/api/invest/admin/treasury/reconcile` |
| POST | `/api/invest/admin/users` |
| POST | `/api/invest/admin/wallet/adjust` |
| GET | `/api/invest/admin/whatsapp-business` |
| PUT | `/api/invest/admin/whatsapp-business` |
| POST | `/api/invest/admin/whatsapp-business/test` |
| GET | `/api/invest/agreement-documents/:id` |
| GET | `/api/invest/agreements` |
| GET | `/api/invest/agreements/:id/download` |
| POST | `/api/invest/agreements/:id/sign` |
| GET | `/api/invest/agreements/:id/view` |
| GET | `/api/invest/agreements/:id/view-url` |
| POST | `/api/invest/agreements/generate` |
| GET | `/api/invest/agreements/settings/public` |
| POST | `/api/invest/auth/change-email` |
| POST | `/api/invest/auth/change-password` |
| POST | `/api/invest/auth/forgot-password` |
| POST | `/api/invest/auth/google` |
| POST | `/api/invest/auth/google/link` |
| POST | `/api/invest/auth/google/unlink` |
| POST | `/api/invest/auth/login` |
| POST | `/api/invest/auth/login/verify-otp` |
| POST | `/api/invest/auth/logout` |
| GET | `/api/invest/auth/me` |
| POST | `/api/invest/auth/register` |
| GET | `/api/invest/auth/register/captcha` |
| POST | `/api/invest/auth/register/send-otp` |
| POST | `/api/invest/auth/register/verify-otp` |
| POST | `/api/invest/auth/reset-password` |
| POST | `/api/invest/auth/staff-handoff` |
| POST | `/api/invest/auth/staff-handoff/complete` |
| GET | `/api/invest/auth/webauthn/available` |
| POST | `/api/invest/auth/webauthn/login/2fa/options` |
| POST | `/api/invest/auth/webauthn/login/2fa/verify` |
| POST | `/api/invest/auth/webauthn/login/options` |
| POST | `/api/invest/auth/webauthn/login/verify` |
| GET | `/api/invest/dashboard` |
| GET | `/api/invest/deposits` |
| POST | `/api/invest/deposits` |
| GET | `/api/invest/kyc` |
| POST | `/api/invest/kyc` |
| GET | `/api/invest/kyc/draft` |
| PUT | `/api/invest/kyc/draft` |
| GET | `/api/invest/kyc/files` |
| DELETE | `/api/invest/kyc/files/:fieldKey` |
| POST | `/api/invest/kyc/files/:fieldKey` |
| POST | `/api/invest/kyc/revision` |
| GET | `/api/invest/ledger` |
| GET | `/api/invest/maturity-choices` |
| POST | `/api/invest/maturity/:subId/choice` |
| GET | `/api/invest/notifications` |
| POST | `/api/invest/notifications/:id/read` |
| GET | `/api/invest/notifications/list` |
| POST | `/api/invest/notifications/read-all` |
| GET | `/api/invest/payout-details` |
| PUT | `/api/invest/payout-details` |
| POST | `/api/invest/payout-details/request` |
| GET | `/api/invest/payouts` |
| POST | `/api/invest/payouts` |
| POST | `/api/invest/payouts/confirm` |
| POST | `/api/invest/payouts/initiate` |
| PUT | `/api/invest/profile` |
| POST | `/api/invest/promo/validate` |
| GET | `/api/invest/public/bank-details` |
| GET | `/api/invest/public/crypto-rates` |
| GET | `/api/invest/public/deposit-accounts` |
| GET | `/api/invest/public/gateways` |
| GET | `/api/invest/public/homepage` |
| GET | `/api/invest/public/maintenance` |
| GET | `/api/invest/public/mobile-app` |
| GET | `/api/invest/public/partners` |
| GET | `/api/invest/public/plans` |
| GET | `/api/invest/public/plans/:id/calc` |
| GET | `/api/invest/public/portal-config` |
| GET | `/api/invest/public/referral/leaderboard` |
| POST | `/api/invest/public/referral/track` |
| GET | `/api/invest/public/support-links` |
| GET | `/api/invest/public/verify-certificate` |
| GET | `/api/invest/referral/leaderboard` |
| GET | `/api/invest/referral/stats` |
| POST | `/api/invest/security/2fa/disable` |
| POST | `/api/invest/security/2fa/enable` |
| POST | `/api/invest/security/2fa/setup` |
| GET | `/api/invest/security/2fa/status` |
| PUT | `/api/invest/security/locale` |
| GET | `/api/invest/security/onboarding` |
| PUT | `/api/invest/security/onboarding` |
| POST | `/api/invest/security/push/subscribe` |
| GET | `/api/invest/security/push/vapid` |
| GET | `/api/invest/security/security` |
| POST | `/api/invest/security/webauthn/authenticate/options` |
| DELETE | `/api/invest/security/webauthn/credentials/:id` |
| POST | `/api/invest/security/webauthn/register/options` |
| POST | `/api/invest/security/webauthn/register/verify` |
| POST | `/api/invest/subscribe` |
| GET | `/api/invest/subscriptions` |
| GET | `/api/invest/subscriptions/:id` |
| GET | `/api/invest/subscriptions/:id/certificate` |
| POST | `/api/invest/subscriptions/:id/early-exit` |
| GET | `/api/invest/subscriptions/:id/early-exit/preview` |
| GET | `/api/invest/tickets` |
| POST | `/api/invest/tickets` |
| POST | `/api/invest/tickets/:id/reply` |
| GET | `/api/invest/wallet` |
| GET | `/api/invest/wallet/history` |
| GET | `/api/invest/wallet/statement.csv` |
| GET | `/api/invest/wallet/statement.pdf` |
| POST | `/api/invest/webhooks/paypal/capture` |
| POST | `/api/invest/webhooks/paypal/create` |
| POST | `/api/invest/webhooks/phonepe/callback` |
| POST | `/api/invest/webhooks/phonepe/initiate` |
| POST | `/api/invest/webhooks/razorpay` |

## Background jobs

| Job | Interval | Overlap guard | Implementation |
|-----|----------|---------------|----------------|
| roi-engine | 1h | roiRunning | backgroundJobs.js → roiEngine.js |
| maturity-notifications | MATURITY_JOB_INTERVAL_MS (6h default) | in-process mutex | maturityNotifications.js |
| treasury-reconciliation | 24h | treasuryRunning | treasury.js |
| support-mail-sync | 5m | mailRunning | supportMail.js |
| referral-auto-payout | 24h | in-process mutex | referralPayoutJob.js |
| roi-payout-reminder | 24h | in-process mutex | roiPayoutReminders.js |

## RBAC permissions (invest admin)

- `view_dashboard`
- `manage_investors`
- `review_kyc`
- `approve_deposits`
- `approve_withdrawals`
- `treasury`
- `manage_settings`
- `broadcast_notifications`
- `manage_plans`
- `manage_gateways`
- `manage_cms`
- `view_audit_logs`

## Integrations

| Channel | Config | Routes / services |
|---------|--------|-------------------|
| SMTP | deploy/.env | `sendMail`, login OTP, KYC/maturity mail |
| WhatsApp | platform settings | notification templates |
| Telegram | platform settings | admin alerts |
| Payment gateways | `PaymentGateway` model | Razorpay, Cashfree, PayU, Stripe webhooks |
| Crypto deposits | public deposit-accounts | USDT TRC20/BEP20, TRX, BNB |
| Redis | `REDIS_URL` | rate limits (`redisRateLimit.js`) |
| ClamAV | `KYC_VIRUS_SCAN_CMD` | KYC staged uploads |

## Data flow (invest)

```
Browser → Nginx (SSL, 100m body) → Express
  → auth/public/investor/admin/security/webhooks
  → Prisma (Investor, Wallet, LedgerEntry, Deposit, Payout, Subscription, Kyc, …)
  → Jobs: ROI, maturity, referral pay, treasury snapshot
```

Regenerate: `node scripts/generate-platform-discovery.mjs`
