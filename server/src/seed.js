import { mainDb, investDb } from "./db.js";
import { hashPassword } from "./utils/auth.js";
import { config } from "./config.js";
import { nanoid } from "nanoid";
import { TAXONOMY, unitForSub, getCatalogStats } from "./data/categories.js";
import { imageForProduct, imageForCategory } from "./data/productImages.js";
import { generateReferralCode } from "./services/referral.js";
import { seedDefaultPaymentGateways, ensureMissingPaymentGateways, ensureDefaultBankAccounts } from "./services/paymentGateways.js";
import { buildPlanCatalog, catalogKey } from "./data/investmentPlans.js";
import { normalizeInvestBrandingText, BRAND_INVEST } from "./data/brand.js";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + nanoid(4);

function defaultMinOrder(unit) {
  if (unit === "MT" || unit === "Container" || unit === "Truck Load") return 1;
  if (unit === "Quintal") return 5;
  if (unit === "Drum" || unit === "Barrel") return 10;
  if (unit === "Piece") return 10;
  if (unit === "Box" || unit === "Carton") return 50;
  return 100;
}

function productDescription(name, listingType, parentName, subName) {
  const trade = listingType === "IMPORT" ? "Import requirement" : "Available for export";
  return `${trade} — bulk B2B ${name} under ${subName} (${parentName}). Request a quotation for MOQ, FOB/CIF terms, and quality certificates.`;
}

// Sync investment plans: category (capital tier) × sub-category (lock-in months).
async function syncInvestmentPlans() {
  const catalog = buildPlanCatalog();
  const keys = new Set(catalog.map((p) => catalogKey(p.planType, p.lockInDays)));

  for (const p of catalog) {
    const existing = await investDb.plan.findFirst({
      where: { planType: p.planType, lockInDays: p.lockInDays },
    });
    const data = {
      name: p.name,
      minInvestment: p.minInvestment,
      maxInvestment: p.maxInvestment,
      profitSharePct: p.profitSharePct,
      monthlyRoiPct: p.monthlyRoiPct,
      annualRoiPct: p.annualRoiPct,
      settlementCycles: p.settlementCycles,
      color: p.color,
      description: p.description,
      isActive: p.isActive,
    };
    if (existing) {
      await investDb.plan.update({ where: { id: existing.id }, data });
    } else {
      await investDb.plan.create({
        data: { planType: p.planType, lockInDays: p.lockInDays, ...data },
      });
    }
  }

  const all = await investDb.plan.findMany({ include: { subscriptions: { take: 1 } } });
  for (const plan of all) {
    if (!keys.has(catalogKey(plan.planType, plan.lockInDays)) && plan.subscriptions.length === 0) {
      await investDb.plan.delete({ where: { id: plan.id } });
    }
  }
  await investDb.plan.updateMany({ data: { settlementCycles: "MONTHLY" } });
  await investDb.subscription.updateMany({ data: { settlementCycle: "MONTHLY" } });
  console.log(`  Plans synced: ${catalog.length} (6 categories × ${catalog.length / 6} lock-in sub-categories), settlement → MONTHLY`);
}

const DEFAULT_INVEST_SETTINGS = [
  { key: "support_email", value: "support@akshayaexim.com" },
  { key: "mail_from", value: "Akshaya Exim <support@akshayaexim.com>" },
  { key: "site_name", value: "AKASHYA INVESTMENTS" },
  { key: "maintenance_mode", value: "false" },
  { key: "maintenance_message", value: "Platform under maintenance. Please check back soon." },
  { key: "referral_commission_pct", value: "2" },
  { key: "referral_level_1_pct", value: "2" },
  { key: "referral_level_2_pct", value: "1" },
  { key: "referral_level_3_pct", value: "0.5" },
  { key: "referral_level_4_pct", value: "0" },
  { key: "referral_level_5_pct", value: "0" },
  { key: "min_withdraw_amount", value: "100" },
  { key: "max_withdraw_amount", value: "500000" },
  { key: "early_exit_enabled", value: "true" },
  { key: "early_exit_penalty_pct", value: "10" },
  { key: "early_exit_forfeit_roi", value: "true" },
  { key: "homepage_hero_title", value: "Smart Investment • Secure Future • Grow Your Wealth" },
  { key: "homepage_hero_subtitle", value: "Invest with Akshaya Investments and earn consistent monthly returns in INR. Flexible lock-in periods, transparent profit sharing, and 100% capital secured." },
  { key: "homepage_about_title", value: "About AKASHYA INVESTMENTS" },
  { key: "homepage_about_body", value: "AKASHYA INVESTMENTS offers structured investment plans with transparent ROI, secure capital protection, and dedicated support for every investor." },
  { key: "homepage_show_calculator", value: "true" },
  { key: "homepage_show_partners", value: "true" },
  { key: "homepage_show_trust_stats", value: "true" },
  { key: "about_company_name", value: "AKASHYA INVESTMENTS" },
  { key: "about_company_tagline", value: "Export • Import • Investment" },
  { key: "about_company_credentials", value: "Registered export house • KYC-verified investors • Secure payment gateways" },
];

async function seedInvestExtras() {
  const promo = await investDb.promoCode.findUnique({ where: { code: "WELCOME5" } });
  if (!promo) {
    await investDb.promoCode.create({
      data: {
        code: "WELCOME5",
        description: "5% bonus on first deposit (min ₹10,000)",
        bonusPct: 5,
        bonusFlat: 0,
        minAmount: 10000,
        appliesTo: "DEPOSIT",
        maxUses: 500,
      },
    });
  }
  const partnerCount = await investDb.sitePartner.count();
  if (partnerCount === 0) {
    await investDb.sitePartner.createMany({
      data: [
        { name: "AKASHYA INVESTMENTS", sortOrder: 1, website: "https://akshayaexim.com" },
        { name: "Export Finance Partners", sortOrder: 2 },
        { name: "Trade Desk India", sortOrder: 3 },
      ],
    });
  }
  for (const p of ["phonepe", "paypal"]) {
    const exists = await investDb.paymentGateway.findFirst({ where: { provider: p } });
    if (!exists) {
      await investDb.paymentGateway.create({
        data: {
          name: p.charAt(0).toUpperCase() + p.slice(1),
          type: "online",
          provider: p,
          minAmount: 100,
          sortOrder: 10,
          isEnabled: true,
        },
      });
    }
  }
  await investDb.investor.updateMany({
    where: { role: { in: ["ADMIN", "SUPERADMIN"] }, onboardingComplete: false },
    data: { onboardingComplete: true },
  });
  await investDb.investor.updateMany({
    where: { email: "investor@akshayaexim.com", onboardingComplete: false },
    data: { onboardingComplete: true },
  });
  await investDb.investor.updateMany({
    where: { role: { in: ["MANAGER", "SUPPORT", "STAFF"] } },
    data: { role: "ADMIN" },
  });
  await investDb.investSetting.updateMany({
    where: { key: "support_email", value: "manager@akshayaexim.com" },
    data: { value: "support@akshayaexim.com" },
  });
  await investDb.investSetting.updateMany({
    where: { key: "mail_from", value: "Akshaya Exim <manager@akshayaexim.com>" },
    data: { value: "Akshaya Exim <support@akshayaexim.com>" },
  });
  await migrateInvestBranding();
}

/** Normalize legacy invest CMS/branding strings in DB (keeps email addresses unchanged). */
async function migrateInvestBranding() {
  const keys = [
    "site_name",
    "homepage_hero_subtitle",
    "homepage_about_title",
    "homepage_about_body",
    "about_company_name",
    "mail_from",
    "agreement_company_legal_name",
  ];
  for (const key of keys) {
    const row = await investDb.investSetting.findUnique({ where: { key } });
    if (!row?.value) continue;
    const next = normalizeInvestBrandingText(row.value);
    if (key === "homepage_about_title" && /exim|traders/i.test(next)) {
      await investDb.investSetting.update({
        where: { key },
        data: { value: `About ${BRAND_INVEST}` },
      });
      continue;
    }
    if (key === "homepage_hero_subtitle" && /invest in akshaya|exim traders/i.test(row.value)) {
      await investDb.investSetting.update({
        where: { key },
        data: { value: normalizeInvestBrandingText(row.value) },
      });
      continue;
    }
    if (next !== row.value) {
      await investDb.investSetting.update({ where: { key }, data: { value: next } });
    }
  }
  await investDb.sitePartner.updateMany({
    where: { name: { in: ["Akshaya Exim Traders", "AKASHYA Exim Traders", "AKASHYA INVESTMENTS"] } },
    data: { name: BRAND_INVEST },
  });
}

async function seedMain() {
  console.log("Seeding MAIN (marketplace) database...");
  // accounts
  await mainDb.user.upsert({
    where: { email: config.seed.superadminEmail },
    update: {},
    create: { email: config.seed.superadminEmail, name: "Super Admin", passwordHash: hashPassword(config.seed.superadminPassword), role: "SUPERADMIN", emailVerified: true },
  });
  await mainDb.user.upsert({
    where: { email: config.seed.adminEmail },
    update: {},
    create: { email: config.seed.adminEmail, name: "Marketplace Admin", passwordHash: hashPassword(config.seed.adminPassword), role: "ADMIN", emailVerified: true },
  });
  await mainDb.user.upsert({
    where: { email: "user@akshayaexim.com" },
    update: {},
    create: { email: "user@akshayaexim.com", name: "Demo Buyer", passwordHash: hashPassword("User@123"), role: "USER", accountType: "B2B", companyName: "Demo Trading Co.", emailVerified: true },
  });

  // Reset catalog so the full EXIM taxonomy is (re)applied on every seed run.
  await mainDb.product.deleteMany({});
  await mainDb.category.deleteMany({});
  let productCount = 0;

  for (const c of TAXONOMY) {
    const parent = await mainDb.category.create({
      data: { name: c.name, slug: slug(c.name), image: imageForCategory(c.name) },
    });
    for (const s of c.sub) {
      const child = await mainDb.category.create({
        data: {
          name: s.name,
          slug: slug(s.name),
          parentId: parent.id,
          image: imageForCategory(s.name),
          description: `${s.name} — B2B import/export listings under ${c.name}.`,
        },
      });

      const unit = unitForSub(c, s);
      const listingType = s.listingType || c.listingType || "EXPORT";
      for (const productName of s.products) {
        const img = imageForProduct(productName, s.name, c.name);
        await mainDb.product.create({
          data: {
            name: productName,
            slug: slug(productName),
            listingType,
            tradeType: "B2B",
            unit,
            minOrderQty: defaultMinOrder(unit),
            basePrice: 0,
            origin: listingType === "IMPORT" ? "Required" : "India",
            categoryId: child.id,
            images: JSON.stringify(img ? [img] : []),
            description: productDescription(productName, listingType, c.name, s.name),
          },
        });
        productCount += 1;
      }
    }
  }

  const stats = getCatalogStats();
  console.log(`  MAIN done. ${stats.topCategories} top categories, ${stats.subCategories} subcategories, ${productCount} products seeded.`);
}

async function seedInvest() {
  console.log("Seeding INVEST (investor portal) database...");
  await investDb.investor.upsert({
    where: { email: config.seed.superadminEmail },
    update: {},
    create: { email: config.seed.superadminEmail, name: "Super Admin", passwordHash: hashPassword(config.seed.superadminPassword), role: "SUPERADMIN", emailVerified: true },
  });
  await investDb.investor.upsert({
    where: { email: config.seed.adminEmail },
    update: {},
    create: { email: config.seed.adminEmail, name: "Invest Admin", passwordHash: hashPassword(config.seed.adminPassword), role: "ADMIN", emailVerified: true },
  });

  // a demo investor with an approved KYC + wallet balance for testing
  const demoEmail = "investor@akshayaexim.com";
  let demo = await investDb.investor.findUnique({ where: { email: demoEmail } });
  if (!demo) {
    demo = await investDb.investor.create({
      data: {
        email: demoEmail,
        name: "Demo Investor",
        passwordHash: hashPassword("Investor@123"),
        role: "INVESTOR",
        emailVerified: true,
        referralCode: generateReferralCode("Demo Investor"),
        upiId: "demo@okhdfc",
        bankName: "HDFC",
        accountNumber: "1234567890",
        ifsc: "HDFC0001234",
      },
    });
    await investDb.wallet.create({ data: { investorId: demo.id, available: 100000 } });
    await investDb.kyc.create({ data: { investorId: demo.id, fullName: "Demo Investor", panNumber: "ABCDE1234F", status: "APPROVED" } });
    await investDb.ledgerEntry.create({ data: { investorId: demo.id, type: "DEPOSIT", direction: "CREDIT", amount: 100000, balanceAfter: 100000, note: "Seed balance" } });
  } else if (!demo.referralCode) {
    demo = await investDb.investor.update({
      where: { id: demo.id },
      data: { referralCode: generateReferralCode(demo.name) },
    });
  }

  await syncInvestmentPlans();

  for (const s of DEFAULT_INVEST_SETTINGS) {
    await investDb.investSetting.upsert({
      where: { key: s.key },
      create: s,
      update: {},
    });
  }
  await seedDefaultPaymentGateways();
  await ensureMissingPaymentGateways();
  await ensureDefaultBankAccounts();
  await seedInvestExtras();
  const { seedRolePermissions } = await import("./services/rbac.js");
  await seedRolePermissions();
  console.log("  INVEST done.");
}

async function main() {
  await seedMain();
  await seedInvest();
  console.log("\nSeed complete.");
  console.log("\n=== MARKETPLACE (akshayaexim.com / .in) ===");
  console.log(`  Super Admin: ${config.seed.superadminEmail} / ${config.seed.superadminPassword}`);
  console.log(`  Admin:       ${config.seed.adminEmail} / ${config.seed.adminPassword}`);
  console.log(`  Demo User:   user@akshayaexim.com / User@123`);
  console.log("\n=== INVEST (invest.akshayaexim.com / .in) ===");
  console.log(`  Super Admin: ${config.seed.superadminEmail} / ${config.seed.superadminPassword}`);
  console.log(`  Admin:       ${config.seed.adminEmail} / ${config.seed.adminPassword}`);
  console.log(`  Demo Investor: investor@akshayaexim.com / Investor@123`);
  await mainDb.$disconnect();
  await investDb.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
