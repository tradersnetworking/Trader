import { test, expect } from "@playwright/test";

const API = process.env.API_BASE || "http://localhost:4000";

test.describe("Invest portal — public", () => {
  test("landing page loads with invest branding", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("body")).toContainText(/invest|Akshaya|ROI|plan/i);
  });

  test("login page renders", async ({ page }) => {
    await page.goto("login");
    await expect(page.getByRole("button", { name: "Login", exact: true })).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  });

  test("register page renders", async ({ page }) => {
    await page.goto("register");
    await expect(page.locator("body")).toContainText(/register|account|investor|पंजीकरण/i);
  });

  test("referral landing stores ref and redirects", async ({ page }) => {
    await page.goto("ref/TEST-CODE-123");
    await page.waitForURL(/register/);
    expect(page.url()).toMatch(/ref=TEST-CODE-123/i);
  });

  test("verify certificate page handles missing token", async ({ page }) => {
    await page.goto("verify-certificate");
    await expect(page.locator("body")).toContainText(/token|certificate|verification/i);
  });
});

test.describe("Invest API smoke", () => {
  test("health endpoint", async ({ request }) => {
    const res = await request.get(`${API}/api/health`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  test("42 active plans", async ({ request }) => {
    const res = await request.get(`${API}/api/invest/public/plans`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.plans.length).toBeGreaterThanOrEqual(42);
  });

  test("gateways include bank APIs", async ({ request }) => {
    const res = await request.get(`${API}/api/invest/public/gateways`);
    const data = await res.json();
    const names = data.gateways.map((g) => g.name);
    expect(names).toContain("hdfc");
    expect(names).toContain("razorpay");
  });

  test("KYC staged upload routes require auth", async ({ request }) => {
    const draft = await request.get(`${API}/api/invest/kyc/draft`);
    expect(draft.status()).toBe(401);
    const file = await request.post(`${API}/api/invest/kyc/files/idFront`);
    expect(file.status()).toBe(401);
  });

  test("referral leaderboard", async ({ request }) => {
    const res = await request.get(`${API}/api/invest/public/referral/leaderboard`);
    if (res.status() === 404) {
      test.skip(true, "Restart API server to load referral leaderboard route");
    }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.leaderboard)).toBe(true);
  });
});

test.describe("Invest portal — authenticated investor", () => {
  const investorEmail = process.env.E2E_INVESTOR_EMAIL || "investor@akshayaexim.com";
  const investorPassword = process.env.E2E_INVESTOR_PASSWORD || "Investor@123";

  test("investor can login via UI and reach dashboard", async ({ page }) => {
    await page.goto("login");
    await page.locator('input[type="email"]').first().fill(investorEmail);
    await page.locator('input[type="password"]').first().fill(investorPassword);
    const loginResp = page.waitForResponse(
      (r) => r.url().includes("/api/invest/auth/login") && r.status() === 200,
    );
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await loginResp;
    await page.waitForURL(/dashboard/, { timeout: 20000 });
    await expect(page.getByText(/balance|Due Today|overview|wallet/i).first()).toBeVisible({ timeout: 30000 });
  });

  test("investor dashboard loads with stored session", async ({ page, request }) => {
    const res = await request.post(`${API}/api/invest/auth/login`, {
      data: { email: investorEmail, password: investorPassword },
    });
    expect(res.ok()).toBeTruthy();
    const { token } = await res.json();
    await page.goto("login");
    await page.evaluate((t) => localStorage.setItem("aex_invest_token", t), token);
    await page.goto("dashboard");
    await expect(page.getByText(/balance|Due Today|overview|wallet/i).first()).toBeVisible({ timeout: 30000 });
  });
});
