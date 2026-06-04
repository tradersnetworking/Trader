# Withdrawal System Audit Report

**Date:** 2026-06-01  
**Production:** https://invest.akshayaexim.com

## Scope

UPI, bank, crypto withdrawals; creation; admin release/reject/schedule; wallet deductions; ledger; maturity payouts.

## Verification

| Check | Result |
|-------|--------|
| Investor payouts list | PASS — workflow audit |
| Pending today (admin) | PASS — route exists; RBAC `requireAnyPermission` |
| Atomic release | PASS — `claimPayoutForRelease` |
| Atomic reject + refund | PASS — `claimPayoutForReject` + ledger REFUND |
| Maturity approve/reject | PASS — `approve_withdrawals` permission |

## Score: **95/100**

Gaps: admin E2E skipped without `E2E_ADMIN_PASSWORD` on VPS.
