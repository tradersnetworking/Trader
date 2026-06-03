/**
 * Sync expanded catalog products into MAIN DB without wiping existing rows.
 */
import { TAXONOMY, unitForSub, productsForSub } from "../data/categories.js";
import { imageForProduct } from "../data/productImages.js";
import { estimateBasePrice } from "./productPricing.js";

function slug(name) {
  return String(name || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function defaultMinOrder(unit) {
  const u = String(unit || "").toLowerCase();
  if (u === "piece" || u === "box") return 100;
  if (u === "carton") return 10;
  if (u === "container" || u === "truck load") return 1;
  return 1;
}

function productDescription(name, listingType, parent, sub) {
  const dir = listingType === "IMPORT" ? "import requirement" : "export listing";
  return `${name} — ${dir} under ${sub} (${parent}). Indicative B2B price; request quote for firm offer.`;
}

/** Remove duplicate rows (same name + category), keep oldest. */
export async function dedupeCatalogProducts(db) {
  const all = await db.product.findMany({ orderBy: { createdAt: "asc" } });
  const seen = new Set();
  let removed = 0;
  for (const p of all) {
    const key = `${p.categoryId || ""}|${String(p.name).toLowerCase()}`;
    if (seen.has(key)) {
      await db.product.delete({ where: { id: p.id } });
      removed += 1;
    } else {
      seen.add(key);
    }
  }
  return { removed };
}

export async function syncNewCatalogProducts(db) {
  const categories = await db.category.findMany({ include: { parent: true } });
  const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  let created = 0;

  for (const top of TAXONOMY) {
    for (const sub of top.sub) {
      const child = byName.get(sub.name.toLowerCase());
      if (!child) continue;

      const unit = unitForSub(top, sub);
      const listingType = sub.listingType || top.listingType || "EXPORT";

      for (const productName of productsForSub(top, sub)) {
        const productSlug = slug(productName);
        const exists = await db.product.findFirst({
          where: { name: productName, categoryId: child.id },
        });
        if (exists) continue;

        const img = imageForProduct(productName, sub.name, top.name);
        const basePrice = estimateBasePrice({
          name: productName,
          unit,
          listingType,
          categoryName: top.name,
          subCategoryName: sub.name,
        });

        await db.product.create({
          data: {
            name: productName,
            slug: productSlug,
            listingType,
            tradeType: "B2B",
            unit,
            minOrderQty: defaultMinOrder(unit),
            basePrice,
            origin: listingType === "IMPORT" ? "Required" : "India",
            categoryId: child.id,
            images: JSON.stringify(img ? [img] : []),
            description: productDescription(productName, listingType, top.name, sub.name),
          },
        });
        created += 1;
      }
    }
  }

  return { created };
}
