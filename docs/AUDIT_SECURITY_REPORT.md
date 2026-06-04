# Security Audit Report — Akshaya Invest Portal

**Date:** 2026-06-01 · **Production:** https://invest.akshayaexim.com

## Summary

| Control | Status |
|---------|--------|
| Authentication (JWT + session validation) | Pass |
| Scope isolation (`invest` vs `main`) | Pass |
| RBAC on admin mutations | Pass (post `2985a95`) |
| File upload validation (KYC) | Pass |
| Security headers (HSTS, nosniff, frame) | Pass |
| SQL injection (Prisma) | Pass |
| Atomic payout/deposit status | Pass |

**Score: 90/100**

## Findings

### Resolved (this release)

| ID | Issue | Root cause | Impact | Fix |
|----|-------|------------|--------|-----|
| S-01 | Any admin could reject deposits / release referrals | Routes used `adminOnly` only | Privilege escalation | `requirePermission` + treasury on referral pay |
| S-02 | Double payout release | Non-atomic status update | Duplicate disburse | `claimPayoutForRelease` in `payoutAtomic.js` |
| S-03 | Double deposit credit | No status gate on approve | Balance inflation | `updateMany` where `status=PENDING` |

### Open (non-critical)

| ID | Issue | Recommendation |
|----|-------|----------------|
| S-04 | No ClamAV on VPS | Set `KYC_VIRUS_SCAN_CMD` |
| S-05 | Rate limits in-memory | Redis when scaling horizontally |
| S-06 | CSP not strict | Add nonce-based CSP for invest SPA |
| S-07 | Prod admin creds not in CI | Set `E2E_ADMIN_PASSWORD` for live admin probe |

## OWASP mapping

- **A01 Broken Access Control:** Mitigated via RBAC matrix + route guards.
- **A03 Injection:** Prisma parameterized queries; upload extension/MIME checks.
- **A07 Auth failures:** Session supersede + OTP paths on sensitive actions.
- **A08 Integrity:** Atomic financial status transitions.
