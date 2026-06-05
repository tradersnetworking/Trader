import { test } from "node:test";
import assert from "node:assert/strict";

function commissionAmount(amount, pct = 1) {
  return Math.round((Number(amount) * pct) / 100 * 100) / 100;
}

test("1% platform commission on deposit", () => {
  assert.equal(commissionAmount(100000), 1000);
  assert.equal(commissionAmount(50000), 500);
});

test("1% platform commission on investment", () => {
  assert.equal(commissionAmount(250000), 2500);
});
