import { test, expect } from "@playwright/test";

const API = (process.env.PLAYWRIGHT_API_URL || process.env.INVEST_API || "https://invest.akshayaexim.com").replace(/\/$/, "");
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe("Admin production API", () => {
  test.beforeEach(() => {
    test.skip(!adminEmail || !adminPassword, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD");
  });

  test("admin can load dashboard and KYC queue", async ({ request }) => {
    const login = await request.post(`${API}/api/invest/auth/login`, {
      data: { email: adminEmail, password: adminPassword },
    });
    expect(login.ok()).toBeTruthy();
    const { token, user } = await login.json();
    expect(token).toBeTruthy();
    expect(["ADMIN", "SUPERADMIN"]).toContain(user?.role);

    const dash = await request.get(`${API}/api/invest/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(dash.ok()).toBeTruthy();

    const kyc = await request.get(`${API}/api/invest/admin/kyc`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(kyc.ok()).toBeTruthy();
    const data = await kyc.json();
    expect(Array.isArray(data.kyc)).toBe(true);
  });
});
