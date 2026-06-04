import { test } from "node:test";
import assert from "node:assert/strict";

/** Pure drift formula used by getTreasurySnapshot (no DB). */
function ledgerDrift(credits, debits, totalLiabilities) {
  return Math.round((credits - debits - totalLiabilities) * 100) / 100;
}

test("treasury drift is zero when ledger net equals wallet liabilities", () => {
  const liabilities = 250000;
  const credits = 300000;
  const debits = 50000;
  assert.equal(ledgerDrift(credits, debits, liabilities), 0);
});

test("treasury drift detects imbalance", () => {
  assert.equal(ledgerDrift(100, 40, 50), 10);
});
