import { describe, it } from "node:test";
import assert from "node:assert";
import { validateKycUploadBasics, validateKycFileMagic } from "../src/services/kycUploadSecurity.js";
import { isAllowedKycUploadField } from "../src/constants/kycUploadFields.js";

describe("kyc upload security", () => {
  it("allows known field keys", () => {
    assert.equal(isAllowedKycUploadField("panDocument"), true);
    assert.equal(isAllowedKycUploadField("evil"), false);
  });

  it("rejects blocked extensions", () => {
    const r = validateKycUploadBasics({
      path: "/tmp/x.exe",
      originalname: "malware.exe",
      size: 5000,
    });
    assert.equal(r.ok, false);
    assert.equal(r.code, "BLOCKED_TYPE");
  });

  it("accepts pdf extension size check", () => {
    const r = validateKycUploadBasics({
      path: "/tmp/x.pdf",
      originalname: "doc.pdf",
      size: 5000,
    });
    assert.equal(r.ok, true);
    assert.equal(r.ext, ".pdf");
  });
});
