import { Router } from "express";
import { nanoid } from "nanoid";
import { mainDb } from "../db.js";
import { asyncH, authRequired, requireRole, optionalAuth } from "../middleware.js";
import { config } from "../config.js";
import { listGateways, createOrder } from "../payments/gateways.js";
import { payoutGatewayStatus } from "../payments/payouts.js";
import { upload, fileUrl } from "../utils/upload.js";

const router = Router();
const SCOPE = "main";
const isAdmin = requireRole("ADMIN", "SUPERADMIN");

function slugify(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + nanoid(4);
}

/* ---------------- Categories ---------------- */
router.get(
  "/categories",
  asyncH(async (_req, res) => {
    const cats = await mainDb.category.findMany({ orderBy: { name: "asc" }, include: { children: true } });
    const roots = cats.filter((c) => !c.parentId);
    res.json({ categories: roots });
  })
);

router.post(
  "/categories",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (req, res) => {
    const { name, description, image, parentId } = req.body;
    const cat = await mainDb.category.create({ data: { name, slug: slugify(name), description, image, parentId: parentId || null } });
    res.json({ category: cat });
  })
);

router.put(
  "/categories/:id",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (req, res) => {
    const { name, description, image, parentId } = req.body;
    const cat = await mainDb.category.update({ where: { id: req.params.id }, data: { name, description, image, parentId: parentId || null } });
    res.json({ category: cat });
  })
);

router.delete(
  "/categories/:id",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (req, res) => {
    await mainDb.category.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

/* ---------------- Products ---------------- */
router.get(
  "/products",
  asyncH(async (req, res) => {
    const { categoryId, listingType, tradeType, q, take = 60, skip = 0 } = req.query;
    const where = { isActive: true };
    if (categoryId) where.categoryId = String(categoryId);
    if (listingType) where.listingType = String(listingType);
    if (tradeType && tradeType !== "BOTH") where.OR = [{ tradeType: String(tradeType) }, { tradeType: "BOTH" }];
    if (q) where.name = { contains: String(q) };
    const products = await mainDb.product.findMany({
      where,
      include: { category: { include: { parent: true } } },
      orderBy: { createdAt: "desc" },
      take: Number(take),
      skip: Number(skip),
    });
    res.json({ products: products.map((p) => ({ ...p, images: JSON.parse(p.images || "[]") })) });
  })
);

router.get(
  "/products/:slug",
  asyncH(async (req, res) => {
    const p = await mainDb.product.findUnique({ where: { slug: req.params.slug }, include: { category: true } });
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json({ product: { ...p, images: JSON.parse(p.images || "[]") } });
  })
);

router.post(
  "/products",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (req, res) => {
    const b = req.body;
    const p = await mainDb.product.create({
      data: {
        name: b.name,
        slug: slugify(b.name),
        description: b.description,
        listingType: b.listingType === "IMPORT" ? "IMPORT" : "EXPORT",
        tradeType: b.tradeType || "BOTH",
        unit: b.unit || "kg",
        minOrderQty: Number(b.minOrderQty || 1),
        basePrice: Number(b.basePrice || 0),
        currency: b.currency || "INR",
        images: JSON.stringify(b.images || []),
        origin: b.origin,
        hsCode: b.hsCode,
        inStock: b.inStock !== false,
        categoryId: b.categoryId || null,
        ownerId: req.user.id,
      },
    });
    res.json({ product: p });
  })
);

router.put(
  "/products/:id",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (req, res) => {
    const b = req.body;
    const data = { ...b };
    if (b.images) data.images = JSON.stringify(b.images);
    if (b.minOrderQty !== undefined) data.minOrderQty = Number(b.minOrderQty);
    if (b.basePrice !== undefined) data.basePrice = Number(b.basePrice);
    delete data.id;
    delete data.category;
    const p = await mainDb.product.update({ where: { id: req.params.id }, data });
    res.json({ product: p });
  })
);

router.delete(
  "/products/:id",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (req, res) => {
    await mainDb.product.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

router.post(
  "/upload",
  authRequired(SCOPE),
  upload.array("files", 6),
  asyncH(async (req, res) => {
    res.json({ urls: (req.files || []).map((f) => fileUrl(f.filename)) });
  })
);

/* ---------------- Quotes (RFQ both directions) ---------------- */
// BUY: user wants to import/purchase. SELL: user offers to supply in bulk.
router.post(
  "/quotes",
  optionalAuth,
  asyncH(async (req, res) => {
    const b = req.body;
    if (!b.productName || !b.quantity || !b.contactName || !b.contactEmail) {
      return res.status(400).json({ error: "productName, quantity, contactName, contactEmail required" });
    }
    const quote = await mainDb.quote.create({
      data: {
        direction: b.direction === "SELL" ? "SELL" : "BUY",
        productId: b.productId || null,
        productName: b.productName,
        quantity: Number(b.quantity),
        unit: b.unit || "kg",
        targetPrice: b.targetPrice ? Number(b.targetPrice) : null,
        currency: b.currency || "INR",
        message: b.message,
        contactName: b.contactName,
        contactEmail: b.contactEmail,
        contactPhone: b.contactPhone,
        company: b.company,
        userId: req.user?.id || null,
      },
    });
    res.json({ quote });
  })
);

router.get(
  "/quotes/mine",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const quotes = await mainDb.quote.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" } });
    res.json({ quotes });
  })
);

router.get(
  "/quotes",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (req, res) => {
    const { status, direction } = req.query;
    const where = {};
    if (status) where.status = String(status);
    if (direction) where.direction = String(direction);
    const quotes = await mainDb.quote.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json({ quotes });
  })
);

router.put(
  "/quotes/:id",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (req, res) => {
    const { status, adminResponse, quotedPrice } = req.body;
    const quote = await mainDb.quote.update({
      where: { id: req.params.id },
      data: { status, adminResponse, quotedPrice: quotedPrice ? Number(quotedPrice) : undefined },
    });
    res.json({ quote });
  })
);

/* ---------------- Orders + payments ---------------- */
router.get("/payments/gateways", asyncH(async (_req, res) => res.json({ gateways: await listGateways() })));

router.post(
  "/orders",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const { items, gateway } = req.body;
    const total = (items || []).reduce((s, it) => s + Number(it.price) * Number(it.qty), 0);
    const order = await mainDb.order.create({
      data: {
        orderNumber: "AEX-" + nanoid(8).toUpperCase(),
        userId: req.user.id,
        items: JSON.stringify(items || []),
        totalAmount: total,
        paymentGateway: gateway || null,
      },
    });
    const payment = await createOrder(gateway || "razorpay", {
      amount: total,
      currency: "INR",
      receipt: order.orderNumber,
      customer: { id: req.user.id, email: req.user.email },
    });
    res.json({ order, payment });
  })
);

router.get(
  "/orders/mine",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const orders = await mainDb.order.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" } });
    res.json({ orders: orders.map((o) => ({ ...o, items: JSON.parse(o.items || "[]") })) });
  })
);

/* ---------------- Admin: users + stats ---------------- */
router.get(
  "/admin/users",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (_req, res) => {
    const users = await mainDb.user.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ users: users.map(({ passwordHash, resetToken, ...u }) => u) });
  })
);

// Admin can create marketplace user accounts only (not STAFF / ADMIN / SUPERADMIN)
router.post(
  "/admin/users",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (req, res) => {
    const { email, name, password, accountType, companyName, phone } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: "Email, name and password are required" });
    const normalized = email.toLowerCase();
    if (await mainDb.user.findUnique({ where: { email: normalized } })) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const { hashPassword } = await import("../utils/auth.js");
    const user = await mainDb.user.create({
      data: {
        email: normalized,
        name,
        passwordHash: hashPassword(password),
        role: "USER",
        accountType: accountType || "B2B",
        companyName: companyName || null,
        phone: phone || null,
      },
    });
    const { passwordHash, ...u } = user;
    res.json({ user: u });
  })
);

// Only super admin can create staff/admin accounts
router.post(
  "/admin/staff",
  authRequired(SCOPE),
  requireRole("SUPERADMIN"),
  asyncH(async (req, res) => {
    const { email, name, password, role } = req.body;
    const { hashPassword } = await import("../utils/auth.js");
    const user = await mainDb.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash: hashPassword(password),
        role: ["STAFF", "ADMIN"].includes(role) ? role : "STAFF",
      },
    });
    const { passwordHash, ...u } = user;
    res.json({ user: u });
  })
);

router.put(
  "/admin/users/:id",
  authRequired(SCOPE),
  requireRole("SUPERADMIN"),
  asyncH(async (req, res) => {
    const { role, isActive } = req.body;
    const user = await mainDb.user.update({ where: { id: req.params.id }, data: { role, isActive } });
    const { passwordHash, ...u } = user;
    res.json({ user: u });
  })
);

router.get(
  "/admin/stats",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (_req, res) => {
    const [users, products, quotes, orders, openQuotes] = await Promise.all([
      mainDb.user.count(),
      mainDb.product.count(),
      mainDb.quote.count(),
      mainDb.order.count(),
      mainDb.quote.count({ where: { status: "PENDING" } }),
    ]);
    res.json({ stats: { users, products, quotes, orders, openQuotes } });
  })
);

router.get("/bank-details", (_req, res) => res.json({ bank: config.bank, upi: config.upi }));

router.get(
  "/admin/gateways",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (_req, res) => {
    res.json({ collection: await listGateways(), payouts: await payoutGatewayStatus() });
  })
);

export default router;
