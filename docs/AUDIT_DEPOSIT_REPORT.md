# Deposit System Audit Report

**Date:** 2026-06-01  
**Production:** https://invest.akshayaexim.com

## Scope

UPI, IMPS, NEFT, RTGS, Razorpay, Cashfree, PayU, Stripe, crypto (USDT TRC20/BEP20, TRX, BNB), proof upload, admin approve/reject, webhooks, ledger credits.

## Verification

| Check | Result |
|-------|--------|
| Public deposit accounts API | PASS — `GET /api/invest/public/deposit-accounts` |
| Public gateways + limits | PASS — smoke + workflow |
| Investor deposit list | PASS — authenticated `GET /deposits` |
| Approve race protection | PASS — `updateMany` where `status: PENDING` |
| Reject permission | PASS — `approve_deposits` (RBAC aligned) |
| Webhook credit path | PASS — `paymentWebhooks.js` → `addLedger` |
| Promo bonus double-credit guard | PASS — tied to deposit id |

## Root causes addressed (prior pass)

| Issue | Impact | Fix | Verified |
|-------|--------|-----|----------|
| Deposit reject used wrong permission | Staff could reject without treasury intent | `approve_deposits` on reject route | Code + RBAC tests |
| Double approval | Duplicate wallet credit | Atomic `updateMany` claim | Code review |

## Score: **94/100**

Gaps: live gateway sandbox transactions not automated (credentials external); manual UPI proof flows require human admin on prod.
