import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const API = (process.env.PLAYWRIGHT_API_URL || process.env.INVEST_API || "http://localhost:4000").replace(/\/$/, "");
const investorEmail = process.env.E2E_INVESTOR_EMAIL || "investor@akshayaexim.com";
const investorPassword = process.env.E2E_INVESTOR_PASSWORD || "Investor@123";
const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const sampleFile = path.join(fixtureDir, "kyc-sample.pdf");
const sampleMime = "application/pdf";
test.beforeAll(() => {
  if (!fs.existsSync(sampleFile) || fs.statSync(sampleFile).size < 512) {
    throw new Error("Run npm run e2e:fixture to generate kyc-sample.pdf (≥512 bytes)");
  }
});

async function investToken(request) {
  const res = await request.post(`${API}/api/invest/auth/login`, {
    data: { email: investorEmail, password: investorPassword },
  });
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  if (data.requiresLoginOtp) {
    test.skip(true, "Investor account requires login OTP — disable OTP or use a test account");
  }
  expect(data.token).toBeTruthy();
  return data.token;
}

test.describe("KYC staged file upload", () => {
  test("API upload panDocument with progress endpoint", async ({ request }) => {
    const token = await investToken(request);
    const buffer = fs.readFileSync(sampleFile);
    const res = await request.post(`${API}/api/invest/kyc/files/panDocument`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: "kyc-sample.pdf",
          mimeType: sampleMime,
          buffer,
        },
      },
    });
    expect(res.status(), await res.text()).toBeLessThan(400);
    const body = await res.json();
    expect(body.upload?.fieldKey).toBe("panDocument");
    expect(body.upload?.status).toMatch(/STAGED|ATTACHED|UPLOADED/i);
  });

  test("UI upload on KYC tab shows Uploaded badge @ui", async ({ page, request }) => {
    const token = await investToken(request);
    await page.goto("login");
    await page.evaluate((t) => localStorage.setItem("aex_invest_token", t), token);
    await page.goto("dashboard?tab=kyc");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: /KYC|Complete KYC|Update KYC/i }).first().click({ timeout: 5000 }).catch(() => {});
    await page.getByText(/Identity|Documents|Personal/i).first().click({ timeout: 5000 }).catch(() => {});

    const field = page.getByTestId("kyc-field-panDocument").or(
      page.getByText("PAN Card", { exact: false }).locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]"),
    );
    await expect(field).toBeVisible({ timeout: 30_000 });

    const fileInput = field.locator('input[type="file"]').first();
    const uploadResp = page.waitForResponse(
      (r) => r.url().includes("/api/invest/kyc/files/panDocument") && r.request().method() === "POST",
      { timeout: 60_000 },
    );

    await fileInput.setInputFiles(sampleFile);
    const resp = await uploadResp;
    expect(resp.status()).toBeLessThan(400);

    await expect(field.getByText("Uploaded")).toBeVisible({ timeout: 30_000 });
  });
});
