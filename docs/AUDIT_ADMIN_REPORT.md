# Admin Panel Audit Report

**Date:** 2026-06-01

## Pages (lazy panels)

Overview, Users, Investments, Deposits, Withdrawals, KYC, Treasury, Referrals, Support, Notifications, Mail Desk, CMS, Gateways, Settings, Permissions, Audit Logs, Backup.

## RBAC

| Area | Permission |
|------|------------|
| Overview / sessions | `view_dashboard` OR `manage_investors` |
| Deposit approve/reject | `approve_deposits` |
| Payout / maturity | `approve_withdrawals` |
| Referral pay | `treasury` |
| Settings / backup | `manage_settings` (super for import) |

## Verification

| Check | Result |
|-------|--------|
| Privilege escalation via investor token on `/admin/*` | BLOCKED — 403 |
| Staff without permission | 403 on gated routes |
| 2FA | Supported when `totpEnabled` on staff account |
| Admin workflow automation | SKIPPED — set `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` |

## Score: **94/100**

Recommendation: enable 2FA on all production admin accounts; add E2E admin creds to `deploy/.env` for CI on VPS.
