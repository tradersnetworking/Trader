import { investDb, mainDb } from "../db.js";

export const INVEST_DATASETS = {
  investors: { label: "Investors (no passwords)", sensitive: false },
  plans: { label: "Investment plans", sensitive: false },
  subscriptions: { label: "Subscriptions", sensitive: false },
  deposits: { label: "Deposits", sensitive: false },
  payouts: { label: "Withdrawals / payouts", sensitive: false },
  ledger: { label: "Ledger entries", sensitive: false },
  referrals: { label: "Referral earnings", sensitive: false },
  tickets: { label: "Support tickets", sensitive: false },
  agreements: { label: "Agreements (metadata)", sensitive: false },
  kyc: { label: "KYC records (no document files)", sensitive: true },
  audit: { label: "Audit logs", sensitive: false },
  settings: { label: "Site settings (no secrets)", sensitive: false },
};

export const MAIN_DATASETS = {
  users: { label: "Users (no passwords)", sensitive: false },
  products: { label: "Products", sensitive: false },
  categories: { label: "Categories", sensitive: false },
  quotes: { label: "Quotes / RFQ", sensitive: false },
  orders: { label: "Orders", sensitive: false },
  invoices: { label: "Invoices", sensitive: false },
};

function toCsv(rows) {
  if (!rows?.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

export async function exportInvestData(selected = null) {
  const pick = selected?.length ? selected : Object.keys(INVEST_DATASETS);
  const data = {};
  const counts = {};

  if (pick.includes("investors")) {
    data.investors = await investDb.investor.findMany({
      select: { id: true, email: true, name: true, role: true, phone: true, referralCode: true, isActive: true, createdAt: true },
    });
    counts.investors = data.investors.length;
  }
  if (pick.includes("plans")) {
    data.plans = await investDb.plan.findMany();
    counts.plans = data.plans.length;
  }
  if (pick.includes("subscriptions")) {
    data.subscriptions = await investDb.subscription.findMany();
    counts.subscriptions = data.subscriptions.length;
  }
  if (pick.includes("deposits")) {
    data.deposits = await investDb.deposit.findMany();
    counts.deposits = data.deposits.length;
  }
  if (pick.includes("payouts")) {
    data.payouts = await investDb.payout.findMany();
    counts.payouts = data.payouts.length;
  }
  if (pick.includes("ledger")) {
    data.ledger = await investDb.ledgerEntry.findMany({ orderBy: { createdAt: "desc" }, take: 10000 });
    counts.ledger = data.ledger.length;
  }
  if (pick.includes("referrals")) {
    data.referrals = await investDb.referralEarning.findMany();
    counts.referrals = data.referrals.length;
  }
  if (pick.includes("tickets")) {
    data.tickets = await investDb.supportTicket.findMany({ include: { replies: true } });
    counts.tickets = data.tickets.length;
  }
  if (pick.includes("agreements")) {
    data.agreements = await investDb.agreement.findMany({
      select: { id: true, investorId: true, type: true, title: true, agreementUid: true, status: true, signedAt: true, createdAt: true },
    });
    counts.agreements = data.agreements.length;
  }
  if (pick.includes("kyc")) {
    data.kyc = await investDb.kyc.findMany({
      select: { id: true, investorId: true, status: true, fullName: true, panNumber: true, createdAt: true, updatedAt: true },
    });
    counts.kyc = data.kyc.length;
  }
  if (pick.includes("audit")) {
    data.audit = await investDb.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
    counts.audit = data.audit.length;
  }
  if (pick.includes("settings")) {
    const { getAllSettings } = await import("./investSettings.js");
    data.settings = await getAllSettings(false);
    counts.settings = Object.keys(data.settings).length;
  }

  return { portal: "invest", exportedAt: new Date().toISOString(), datasets: pick, counts, data };
}

export async function exportMainData(selected = null) {
  const pick = selected?.length ? selected : Object.keys(MAIN_DATASETS);
  const data = {};
  const counts = {};

  if (pick.includes("users")) {
    data.users = await mainDb.user.findMany({
      select: { id: true, email: true, name: true, role: true, accountType: true, companyName: true, isActive: true, createdAt: true },
    });
    counts.users = data.users.length;
  }
  if (pick.includes("products")) {
    data.products = await mainDb.product.findMany({ include: { category: true } });
    counts.products = data.products.length;
  }
  if (pick.includes("categories")) {
    data.categories = await mainDb.category.findMany({ include: { children: true } });
    counts.categories = data.categories.length;
  }
  if (pick.includes("quotes")) {
    data.quotes = await mainDb.quote.findMany();
    counts.quotes = data.quotes.length;
  }
  if (pick.includes("orders")) {
    data.orders = await mainDb.order.findMany();
    counts.orders = data.orders.length;
  }
  if (pick.includes("invoices")) {
    data.invoices = await mainDb.invoice.findMany();
    counts.invoices = data.invoices.length;
  }

  return { portal: "main", exportedAt: new Date().toISOString(), datasets: pick, counts, data };
}

export function formatExport(payload, format = "json") {
  if (format === "json") return { content: JSON.stringify(payload, null, 2), mime: "application/json", ext: "json" };
  if (format === "csv") {
    const parts = [];
    for (const [key, rows] of Object.entries(payload.data || {})) {
      if (Array.isArray(rows)) parts.push(`# ${key}\n${toCsv(rows)}`);
      else if (typeof rows === "object") parts.push(`# ${key}\n${toCsv([rows])}`);
    }
    return { content: parts.join("\n\n"), mime: "text/csv", ext: "csv" };
  }
  throw new Error("Unsupported format. Use json or csv.");
}

export async function importInvestData(body, { actorId } = {}) {
  const results = { imported: {}, errors: [] };
  const data = body.data || body;

  if (data.plans?.length) {
    let n = 0;
    for (const p of data.plans) {
      const { id, createdAt, updatedAt, ...rest } = p;
      try {
        await investDb.plan.upsert({
          where: { id: id || "___missing___" },
          create: { ...rest, id: id || undefined },
          update: rest,
        }).catch(async () => {
          await investDb.plan.create({ data: rest });
        });
        n++;
      } catch (e) {
        results.errors.push(`plan: ${e.message}`);
      }
    }
    results.imported.plans = n;
  }

  if (data.settings && typeof data.settings === "object") {
    const { setSettings } = await import("./investSettings.js");
    await setSettings(data.settings);
    results.imported.settings = Object.keys(data.settings).length;
  }

  await import("./auditLog.js").then(({ logAudit }) =>
    logAudit({ actorId, action: "DATA_IMPORT", entity: "InvestPortal", meta: JSON.stringify(results.imported) })
  ).catch(() => {});

  return results;
}

export async function importMainData(body, { actorId } = {}) {
  const results = { imported: {}, errors: [] };
  const data = body.data || body;

  if (data.categories?.length) {
    let n = 0;
    for (const c of data.categories) {
      const { children, id, ...rest } = c;
      try {
        if (id) {
          await mainDb.category.upsert({ where: { id }, create: { ...rest, id }, update: rest });
        } else {
          await mainDb.category.create({ data: rest });
        }
        n++;
      } catch (e) {
        results.errors.push(`category: ${e.message}`);
      }
    }
    results.imported.categories = n;
  }

  if (data.products?.length) {
    let n = 0;
    for (const p of data.products) {
      const { category, id, ...rest } = p;
      try {
        if (id) {
          await mainDb.product.upsert({ where: { id }, create: { ...rest, id, categoryId: rest.categoryId || category?.id }, update: rest });
        } else {
          await mainDb.product.create({ data: { ...rest, categoryId: rest.categoryId || category?.id } });
        }
        n++;
      } catch (e) {
        results.errors.push(`product: ${e.message}`);
      }
    }
    results.imported.products = n;
  }

  return results;
}
