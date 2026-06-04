import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  monthlyReturn,
  settlementPayoutAmount,
  annualRoiPct,
  effectiveAnnualRoiPct,
  normalizeSettlementCycleId,
} from "../src/utils/invest.js";

describe("investment math", () => {
  it("monthly return is principal × ROI%", () => {
    assert.equal(monthlyReturn(1_000_000, 15), 150_000);
  });

  it("weekly settlement is one-fourth of monthly", () => {
    assert.equal(settlementPayoutAmount(1_000_000, 15, "WEEKLY"), 37_500);
  });

  it("annual ROI is monthly × 12", () => {
    assert.equal(annualRoiPct(15), 180);
  });

  it("effective annual compounds monthly", () => {
    assert.ok(effectiveAnnualRoiPct(15) > 180);
  });

  it("normalizes invalid settlement cycles to MONTHLY", () => {
    assert.equal(normalizeSettlementCycleId("bogus"), "MONTHLY");
  });
});
