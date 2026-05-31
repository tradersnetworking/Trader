import { mainDb, investDb } from "./db.js";
import { hashPassword } from "./utils/auth.js";
import { config } from "./config.js";
import { nanoid } from "nanoid";
import { TAXONOMY } from "./data/categories.js";
import { imageForProduct } from "./data/productImages.js";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + nanoid(4);

const SAMPLE_PRODUCTS = [
  { cat: "Agro Products & Commodities", name: "Turmeric Finger (Export Grade)", listingType: "EXPORT", unit: "kg", min: 500, price: 95, origin: "India" },
  { cat: "Agro Products & Commodities", name: "1121 Basmati Rice", listingType: "EXPORT", unit: "MT", min: 18, price: 78000, origin: "India" },
  { cat: "Ayurvedic & Herbal Powder", name: "Organic Moringa Leaf Powder", listingType: "EXPORT", unit: "kg", min: 100, price: 320, origin: "Tamil Nadu" },
  { cat: "Beverages", name: "Cold Pressed Fruit Juice (Bulk)", listingType: "EXPORT", unit: "litre", min: 200, price: 120, origin: "India" },
  { cat: "Base Metals & Articles", name: "Iron Ore Fines Fe 62%", listingType: "EXPORT", unit: "MT", min: 1000, price: 8500, origin: "India" },
  { cat: "Aluminum & Aluminum Products", name: "Aluminium Ingots 99.7%", listingType: "EXPORT", unit: "MT", min: 5, price: 215000, origin: "India" },
  { cat: "Aluminium Scrap", name: "Copper Cathode 99.99% (Import)", listingType: "IMPORT", unit: "MT", min: 5, price: 820000, origin: "Required" },
  { cat: "Agro Chemicals", name: "Urea 46% Nitrogen (Import Requirement)", listingType: "IMPORT", unit: "MT", min: 500, price: 32000, origin: "Required" },
  { cat: "Anti Infective Drugs & Medicines", name: "Paracetamol 500mg Tablets", listingType: "EXPORT", unit: "box", min: 200, price: 45, origin: "India" },
  { cat: "Agriculture Product Stocks", name: "Fresh Red Onion", listingType: "EXPORT", unit: "MT", min: 25, price: 18000, origin: "Maharashtra" },
  { cat: "Cables/Cable Accessories & Conductors", name: "Copper Power Cable (Import)", listingType: "IMPORT", unit: "km", min: 10, price: 145000, origin: "Required" },
  { cat: "Acrylic Fabric", name: "Acrylic Fabric Rolls", listingType: "EXPORT", unit: "MT", min: 2, price: 240000, origin: "India" },
];

// Investment plans matching the brochure image.
// (Gold uses 360 days instead of 365 so every lock-in is a multiple of 30 days.)
const PLANS = [
  { planType: "STARTER",  name: "Starter Plan",  lockInDays: 30,   monthlyRoiPct: 10, annualRoiPct: 120, color: "#2e7d32" },
  { planType: "BRONZE",   name: "Bronze Plan",   lockInDays: 90,   monthlyRoiPct: 12, annualRoiPct: 144, color: "#a9622b" },
  { planType: "SILVER",   name: "Silver Plan",   lockInDays: 180,  monthlyRoiPct: 15, annualRoiPct: 180, color: "#8a9099" },
  { planType: "GOLD",     name: "Gold Plan",     lockInDays: 360,  monthlyRoiPct: 17, annualRoiPct: 204, color: "#d4a017" },
  { planType: "PLATINUM", name: "Platinum Plan", lockInDays: 720,  monthlyRoiPct: 19, annualRoiPct: 228, color: "#2f6db5" },
  { planType: "DIAMOND",  name: "Diamond Plan",  lockInDays: 1080, monthlyRoiPct: 20, annualRoiPct: 240, color: "#7b3fb0" },
];

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

  // Reset catalog so the full taxonomy is (re)applied on every seed run.
  await mainDb.product.deleteMany({});
  await mainDb.category.deleteMany({});
  const subMap = {};
  const subToParent = {};
  for (const c of TAXONOMY) {
    const parent = await mainDb.category.create({ data: { name: c.name, slug: slug(c.name) } });
    for (const s of c.sub) {
      const child = await mainDb.category.create({ data: { name: s, slug: slug(s), parentId: parent.id } });
      if (!subMap[s]) subMap[s] = child.id;
      subToParent[s] = c.name;
    }
  }
  for (const p of SAMPLE_PRODUCTS) {
    const img = imageForProduct(p.name, p.cat, subToParent[p.cat]);
    await mainDb.product.create({
      data: {
        name: p.name, slug: slug(p.name), listingType: p.listingType, tradeType: "BOTH",
        unit: p.unit, minOrderQty: p.min, basePrice: p.price, origin: p.origin,
        categoryId: subMap[p.cat] || null,
        images: JSON.stringify(img ? [img] : []),
        description: `${p.listingType === "EXPORT" ? "Available for export" : "Import requirement"} - bulk ${p.name}. Request a quote for best bulk pricing.`,
      },
    });
  }
  console.log(`  MAIN done. ${TAXONOMY.length} categories seeded.`);
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
      data: { email: demoEmail, name: "Demo Investor", passwordHash: hashPassword("Investor@123"), role: "INVESTOR", emailVerified: true, upiId: "demo@okhdfc", bankName: "HDFC", accountNumber: "1234567890", ifsc: "HDFC0001234" },
    });
    await investDb.wallet.create({ data: { investorId: demo.id, available: 100000 } });
    await investDb.kyc.create({ data: { investorId: demo.id, fullName: "Demo Investor", panNumber: "ABCDE1234F", status: "APPROVED" } });
    await investDb.ledgerEntry.create({ data: { investorId: demo.id, type: "DEPOSIT", direction: "CREDIT", amount: 100000, balanceAfter: 100000, note: "Seed balance" } });
  }

  if ((await investDb.plan.count()) === 0) {
    for (const p of PLANS) {
      await investDb.plan.create({
        data: {
          planType: p.planType, name: p.name, lockInDays: p.lockInDays,
          minInvestment: 10000, maxInvestment: 50000000,
          profitSharePct: p.monthlyRoiPct, monthlyRoiPct: p.monthlyRoiPct, annualRoiPct: p.annualRoiPct,
          settlementCycles: "WEEKLY,MONTHLY", color: p.color,
          description: `${p.name}: ${p.monthlyRoiPct}% monthly ROI, ${p.lockInDays}-day lock-in. Profit share ${p.monthlyRoiPct}% per month.`,
        },
      });
    }
  }
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
