import { Router } from "express";
import { nanoid } from "nanoid";
import { mainDb } from "../db.js";
import { asyncH, authRequired, requireRole, optionalAuth } from "../middleware.js";
import { config } from "../config.js";
import { listGateways, createOrder } from "../payments/gateways.js";
import { payoutGatewayStatus } from "../payments/payouts.js";
import { getAllSettings, setSettings } from "../services/investSettings.js";
import { upload, fileUrl } from "../utils/upload.js";
import { BULK_QUANTITY_UNITS, getCatalogStats } from "../data/categories.js";
import {
  exportMainData,
  formatExport,
  importMainData,
  MAIN_DATASETS,
} from "../services/dataPortability.js";
import {
  getPublicMainSiteConfig,
  getMainSiteSettings,
  setMainSiteSettings,
  getMainSiteAdminStats,
  buildSitemapXml,
  buildRobotsTxt,
  pingSearchEngines,
} from "../services/mainSiteSettings.js";

const router = Router();
const SCOPE = "main";
const isAdmin = requireRole("ADMIN", "SUPERADMIN", "STAFF");
const superOnly = requireRole("SUPERADMIN");

function slugify(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + nanoid(4);
}

router.get("/meta", (_req, res) => {
  res.json({
    units: BULK_QUANTITY_UNITS,
    catalog: getCatalogStats(),
    shippingTerms: ["FOB", "CIF", "EXW", "CFR", "CPT"],
  });
});

router.get(
  "/public/site-config",
  asyncH(async (_req, res) => {
    res.json({ config: await getPublicMainSiteConfig() });
  })
);

router.get(
  "/public/sitemap.xml",
  asyncH(async (_req, res) => {
    res.setHeader("Content-Type", "application/xml");
    res.send(await buildSitemapXml());
  })
);

router.get(
  "/public/robots.txt",
  asyncH(async (_req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.send(await buildRobotsTxt());
  })
);

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
      orderId: order.id,
      portal: "main",
      kind: "order",
      productinfo: "Product order",
      customer: { id: req.user.id, email: req.user.email, phone: req.user.phone, name: req.user.name },
    });
    const gatewayRef = payment?.merchantTransactionId || payment?.orderId;
    if (gatewayRef) {
      await mainDb.order.update({ where: { id: order.id }, data: { paymentRef: String(gatewayRef) } });
      order.paymentRef = String(gatewayRef);
    }
    res.json({ order, payment });
  })
);

router.post(
  "/orders/:id/pay",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const order = await mainDb.order.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.paymentStatus === "PAID") return res.status(400).json({ error: "Already paid" });
    const gateway = req.body.gateway || order.paymentGateway || "razorpay";
    const payment = await createOrder(gateway, {
      amount: order.totalAmount,
      currency: order.currency || "INR",
      receipt: order.orderNumber,
      orderId: order.id,
      portal: "main",
      kind: "order",
      productinfo: "Product order",
      customer: { id: req.user.id, email: req.user.email, phone: req.user.phone, name: req.user.name },
    });
    const gatewayRef = payment?.merchantTransactionId || payment?.orderId;
    if (gatewayRef) {
      await mainDb.order.update({ where: { id: order.id }, data: { paymentGateway: gateway.toUpperCase(), paymentRef: String(gatewayRef) } });
    }
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

/* ---------------- Invoices ---------------- */
router.get("/invoices/seller", (_req, res) => res.json({ seller: sellerDetails() }));

router.get(
  "/invoices/mine",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const invoices = await mainDb.invoice.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ invoices: invoices.map(serializeInvoice) });
  })
);

router.get(
  "/invoices/:id",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const inv = await mainDb.invoice.findUnique({ where: { id: req.params.id } });
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    const isOwner = inv.userId === req.user.id;
    const admin = ["ADMIN", "SUPERADMIN", "STAFF"].includes(req.user.role);
    if (!isOwner && !admin) return res.status(403).json({ error: "Forbidden" });
    res.json({ invoice: serializeInvoice(inv), seller: sellerDetails() });
  })
);

router.post(
  "/invoices",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const user = await mainDb.user.findUnique({ where: { id: req.user.id } });
    const {
      billToName,
      billToCompany,
      billToGst,
      billToAddress,
      billToEmail,
      items,
      taxPct,
      notes,
      dueDate,
      orderId,
      quoteId,
      status,
    } = req.body;
    const { lines, subtotal, taxAmount, totalAmount } = calcInvoiceTotals(items, taxPct);
    if (!lines.length) return res.status(400).json({ error: "At least one line item required" });
    const inv = await mainDb.invoice.create({
      data: {
        invoiceNumber: invoiceNumber(),
        userId: req.user.id,
        orderId: orderId || null,
        quoteId: quoteId || null,
        status: status === "ISSUED" ? "ISSUED" : "DRAFT",
        billToName: billToName || user.name,
        billToCompany: billToCompany || user.companyName,
        billToGst: billToGst || user.gstNumber,
        billToAddress: billToAddress || user.billingAddress,
        billToEmail: billToEmail || user.email,
        items: JSON.stringify(lines),
        subtotal,
        taxPct: Number(taxPct) || 0,
        taxAmount,
        totalAmount,
        notes: notes || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        issuedAt: status === "ISSUED" ? new Date() : null,
      },
    });
    res.json({ invoice: serializeInvoice(inv) });
  })
);

router.put(
  "/invoices/:id",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const existing = await mainDb.invoice.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.id) return res.status(404).json({ error: "Invoice not found" });
    if (existing.status !== "DRAFT") return res.status(400).json({ error: "Only draft invoices can be edited" });
    const { billToName, billToCompany, billToGst, billToAddress, billToEmail, items, taxPct, notes, dueDate, status } = req.body;
    const { lines, subtotal, taxAmount, totalAmount } = calcInvoiceTotals(items ?? parseInvoiceItems(existing.items), taxPct ?? existing.taxPct);
    const nextStatus = status === "ISSUED" ? "ISSUED" : "DRAFT";
    const inv = await mainDb.invoice.update({
      where: { id: req.params.id },
      data: {
        billToName,
        billToCompany,
        billToGst,
        billToAddress,
        billToEmail,
        items: JSON.stringify(lines),
        subtotal,
        taxPct: Number(taxPct ?? existing.taxPct) || 0,
        taxAmount,
        totalAmount,
        notes,
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        status: nextStatus,
        issuedAt: nextStatus === "ISSUED" ? new Date() : null,
      },
    });
    res.json({ invoice: serializeInvoice(inv) });
  })
);

router.post(
  "/invoices/from-order/:orderId",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const order = await mainDb.order.findUnique({ where: { id: req.params.orderId } });
    if (!order || order.userId !== req.user.id) return res.status(404).json({ error: "Order not found" });
    const user = await mainDb.user.findUnique({ where: { id: req.user.id } });
    const orderItems = JSON.parse(order.items || "[]");
    const items = orderItems.map((it) => ({
      description: it.name || it.description || "Order item",
      qty: it.qty || it.quantity || 1,
      unit: it.unit || "unit",
      rate: it.price || it.rate || 0,
    }));
    const { lines, subtotal, taxAmount, totalAmount } = calcInvoiceTotals(items, req.body.taxPct || 0);
    const inv = await mainDb.invoice.create({
      data: {
        invoiceNumber: invoiceNumber(),
        userId: req.user.id,
        orderId: order.id,
        status: "ISSUED",
        billToName: user.name,
        billToCompany: user.companyName,
        billToGst: user.gstNumber,
        billToAddress: user.billingAddress,
        billToEmail: user.email,
        items: JSON.stringify(lines),
        subtotal,
        taxPct: Number(req.body.taxPct) || 0,
        taxAmount,
        totalAmount,
        issuedAt: new Date(),
      },
    });
    res.json({ invoice: serializeInvoice(inv) });
  })
);

router.get(
  "/admin/orders",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (_req, res) => {
    const orders = await mainDb.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true, companyName: true } } },
    });
    res.json({
      orders: orders.map((o) => ({ ...o, items: JSON.parse(o.items || "[]") })),
    });
  })
);

router.put(
  "/admin/orders/:id",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (req, res) => {
    const { status, paymentStatus } = req.body;
    const order = await mainDb.order.update({
      where: { id: req.params.id },
      data: { status, paymentStatus },
    });
    res.json({ order: { ...order, items: JSON.parse(order.items || "[]") } });
  })
);

router.get(
  "/admin/invoices",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (_req, res) => {
    const invoices = await mainDb.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true, companyName: true } } },
    });
    res.json({ invoices: invoices.map(serializeInvoice) });
  })
);

router.post(
  "/admin/invoices",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (req, res) => {
    const { userId, billToName, billToCompany, billToGst, billToAddress, billToEmail, items, taxPct, notes, dueDate, orderId, quoteId, status } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const user = await mainDb.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const { lines, subtotal, taxAmount, totalAmount } = calcInvoiceTotals(items, taxPct);
    if (!lines.length) return res.status(400).json({ error: "At least one line item required" });
    const nextStatus = status === "DRAFT" ? "DRAFT" : "ISSUED";
    const inv = await mainDb.invoice.create({
      data: {
        invoiceNumber: invoiceNumber(),
        userId,
        orderId: orderId || null,
        quoteId: quoteId || null,
        status: nextStatus,
        billToName: billToName || user.name,
        billToCompany: billToCompany || user.companyName,
        billToGst: billToGst || user.gstNumber,
        billToAddress: billToAddress || user.billingAddress,
        billToEmail: billToEmail || user.email,
        items: JSON.stringify(lines),
        subtotal,
        taxPct: Number(taxPct) || 0,
        taxAmount,
        totalAmount,
        notes: notes || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        issuedAt: nextStatus === "ISSUED" ? new Date() : null,
      },
    });
    res.json({ invoice: serializeInvoice(inv) });
  })
);

router.put(
  "/admin/invoices/:id",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (req, res) => {
    const { status, billToName, billToCompany, billToGst, billToAddress, billToEmail, items, taxPct, notes, dueDate } = req.body;
    const existing = await mainDb.invoice.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Invoice not found" });
    const data = {};
    if (status) {
      data.status = status;
      if (status === "ISSUED" && !existing.issuedAt) data.issuedAt = new Date();
    }
    if (billToName != null) data.billToName = billToName;
    if (billToCompany != null) data.billToCompany = billToCompany;
    if (billToGst != null) data.billToGst = billToGst;
    if (billToAddress != null) data.billToAddress = billToAddress;
    if (billToEmail != null) data.billToEmail = billToEmail;
    if (notes != null) data.notes = notes;
    if (dueDate != null) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (items) {
      const { lines, subtotal, taxAmount, totalAmount } = calcInvoiceTotals(items, taxPct ?? existing.taxPct);
      data.items = JSON.stringify(lines);
      data.subtotal = subtotal;
      data.taxAmount = taxAmount;
      data.totalAmount = totalAmount;
    }
    if (taxPct != null) data.taxPct = Number(taxPct) || 0;
    const inv = await mainDb.invoice.update({ where: { id: req.params.id }, data });
    res.json({ invoice: serializeInvoice(inv) });
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
    const [users, products, quotes, orders, openQuotes, invoices] = await Promise.all([
      mainDb.user.count(),
      mainDb.product.count(),
      mainDb.quote.count(),
      mainDb.order.count(),
      mainDb.quote.count({ where: { status: "PENDING" } }),
      mainDb.invoice.count(),
    ]);
    res.json({ stats: { users, products, quotes, orders, openQuotes, invoices } });
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

router.get(
  "/admin/settings",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (_req, res) => {
    res.json({ settings: await getAllSettings(false) });
  })
);

router.put(
  "/admin/settings",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (req, res) => {
    const settings = await setSettings(req.body);
    res.json({ settings });
  })
);

router.get(
  "/admin/site-settings",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (_req, res) => {
    res.json({ settings: await getMainSiteSettings() });
  })
);

router.put(
  "/admin/site-settings",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (req, res) => {
    const settings = await setMainSiteSettings(req.body);
    let ping = null;
    if (settings.main_sitemap_auto_ping === "true") {
      ping = await pingSearchEngines();
    }
    res.json({ settings, ping });
  })
);

router.post(
  "/admin/site-settings/ping-sitemap",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (_req, res) => {
    const ping = await pingSearchEngines();
    res.json({ ok: true, ping });
  })
);

router.get(
  "/admin/site-stats",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (_req, res) => {
    res.json(await getMainSiteAdminStats());
  })
);

router.get(
  "/admin/export/datasets",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (_req, res) => {
    res.json({ datasets: MAIN_DATASETS });
  })
);

router.get(
  "/admin/export",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (req, res) => {
    const datasets = req.query.datasets ? String(req.query.datasets).split(",").filter(Boolean) : null;
    const format = String(req.query.format || "json").toLowerCase();
    const payload = await exportMainData(datasets);
    const { content, mime, ext } = formatExport(payload, format);
    if (format === "json") return res.json(payload);
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="akshaya-main-export.${ext}"`);
    res.send(content);
  })
);

router.post(
  "/admin/import",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (req, res) => {
    const result = await importMainData(req.body, { actorId: req.user.id });
    res.json(result);
  })
);

/* ---------------- Trade KYC (buyers & suppliers) ---------------- */
router.get(
  "/trade-kyc/mine",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const { getTradeKyc } = await import("../services/tradeOps.js");
    res.json({ kyc: await getTradeKyc(req.user.id) });
  })
);

router.post(
  "/trade-kyc",
  authRequired(SCOPE),
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "panDocument", maxCount: 1 },
    { name: "aadhaarFront", maxCount: 1 },
    { name: "aadhaarBack", maxCount: 1 },
    { name: "passportDocument", maxCount: 1 },
    { name: "companyRegDoc", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
    { name: "bankProof", maxCount: 1 },
    { name: "cancelledCheque", maxCount: 1 },
  ]),
  asyncH(async (req, res) => {
    const { upsertTradeKyc } = await import("../services/tradeOps.js");
    const body = { ...req.body };
    for (const [field, files] of Object.entries(req.files || {})) {
      if (files?.[0]) body[field] = fileUrl(files[0].filename);
    }
    const kyc = await upsertTradeKyc(req.user.id, body);
    if (body.phoneCountryCode || body.phone) {
      await mainDb.user.update({
        where: { id: req.user.id },
        data: { phone: body.phone || undefined, phoneCountryCode: body.phoneCountryCode || undefined },
      });
    }
    res.json({ kyc });
  })
);

router.get(
  "/admin/trade-kyc",
  authRequired(SCOPE),
  isAdmin,
  asyncH(async (req, res) => {
    const where = req.query.status ? { status: String(req.query.status) } : {};
    const kyc = await mainDb.tradeKyc.findMany({ where, include: { user: true }, orderBy: { createdAt: "desc" } });
    res.json({ kyc });
  })
);

router.post(
  "/admin/trade-kyc/:id/decision",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (req, res) => {
    const { decideTradeKyc } = await import("../services/tradeOps.js");
    const { status, remarks } = req.body;
    res.json({ kyc: await decideTradeKyc(req.params.id, status, remarks) });
  })
);

/* ---------------- Trade payments (collect / disburse) ---------------- */
router.get(
  "/admin/trade-payments",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (req, res) => {
    const where = req.query.direction ? { direction: String(req.query.direction) } : {};
    const payments = await mainDb.tradePayment.findMany({ where, include: { user: true }, orderBy: { createdAt: "desc" } });
    res.json({ payments });
  })
);

router.post(
  "/admin/trade-payments",
  authRequired(SCOPE),
  superOnly,
  upload.single("proofImage"),
  asyncH(async (req, res) => {
    const { createTradePayment } = await import("../services/tradeOps.js");
    const direction = req.body.direction || "COLLECT";
    const isManual = ["UPI", "IMPS", "NEFT", "RTGS", "BANK"].includes(String(req.body.method || "").toUpperCase());
    if (isManual && !req.file) return res.status(400).json({ error: "Payment proof required for manual transfer." });
    res.json(await createTradePayment({
      ...req.body,
      proofImage: req.file ? fileUrl(req.file.filename) : null,
    }));
  })
);

router.post(
  "/admin/trade-payments/:id/status",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (req, res) => {
    const { updateTradePaymentStatus } = await import("../services/tradeOps.js");
    res.json({ payment: await updateTradePaymentStatus(req.params.id, req.body.status, req.body.remarks) });
  })
);

router.get(
  "/payments/routing-info",
  asyncH(async (_req, res) => {
    const { paymentOrigin, webhookPath } = await import("../utils/paymentUrls.js");
    res.json({
      paymentOrigin: paymentOrigin(),
      webhooks: {
        razorpay: `${paymentOrigin()}${webhookPath("razorpay")}`,
        phonepe: `${paymentOrigin()}${webhookPath("phonepe/callback")}`,
        paypalCapture: `${paymentOrigin()}/api/payments/webhooks/paypal/capture`,
      },
      note: "Register these URLs in gateway dashboards on the main domain only.",
    });
  })
);

export default router;
