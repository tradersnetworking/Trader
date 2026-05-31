// Matched product & category images — same curated URLs as server seed.
// Priority: uploaded images → product name → sub-category → parent category.

const PRODUCT_IMAGES = {
  "Turmeric Finger (Export Grade)": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&h=600&fit=crop",
  "1121 Basmati Rice": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&h=600&fit=crop",
  "Organic Moringa Leaf Powder": "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=600&h=600&fit=crop",
  "Cold Pressed Fruit Juice (Bulk)": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&h=600&fit=crop",
  "Iron Ore Fines Fe 62%": "https://images.unsplash.com/photo-1518709268805-4e9042af2179?w=600&h=600&fit=crop",
  "Aluminium Ingots 99.7%": "https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=600&h=600&fit=crop",
  "Copper Cathode 99.99% (Import)": "https://images.unsplash.com/photo-1611273426858-450d8e3a9bab?w=600&h=600&fit=crop",
  "Urea 46% Nitrogen (Import Requirement)": "https://images.unsplash.com/photo-1625246333195-78dbe9b43496?w=600&h=600&fit=crop",
  "Paracetamol 500mg Tablets": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&h=600&fit=crop",
  "Fresh Red Onion": "https://images.unsplash.com/photo-1518977956812-c1673ef64296?w=600&h=600&fit=crop",
  "Copper Power Cable (Import)": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop",
  "Acrylic Fabric Rolls": "https://images.unsplash.com/photo-1558171813-1197032c3929?w=600&h=600&fit=crop",
};

const CATEGORY_IMAGES = {
  Agriculture: "https://images.unsplash.com/photo-1625246333195-78dbe9b43496?w=600&h=400&fit=crop",
  "Apparel & Fashion": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=400&fit=crop",
  Automobile: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=400&fit=crop",
  Chemicals: "https://images.unsplash.com/photo-1532187863486-abf9db881683?w=600&h=400&fit=crop",
  "Food & Beverage": "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&h=400&fit=crop",
  "Mineral & Metals": "https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=600&h=400&fit=crop",
  Machinery: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&h=400&fit=crop",
  Pharmaceuticals: "https://images.unsplash.com/photo-1587854692152-cf1802701a63?w=600&h=400&fit=crop",
  "Textiles & Fabrics": "https://images.unsplash.com/photo-1558171813-1197032c3929?w=600&h=400&fit=crop",
  "Electronics & Electrical Supplies": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
};

const SUBCATEGORY_IMAGES = {
  "Agro Products & Commodities": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&h=600&fit=crop",
  "Ayurvedic & Herbal Powder": "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=600&h=600&fit=crop",
  Beverages: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&h=600&fit=crop",
  "Base Metals & Articles": "https://images.unsplash.com/photo-1518709268805-4e9042af2179?w=600&h=600&fit=crop",
  "Aluminum & Aluminum Products": "https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=600&h=600&fit=crop",
  "Aluminium Scrap": "https://images.unsplash.com/photo-1611273426858-450d8e3a9bab?w=600&h=600&fit=crop",
  "Agro Chemicals": "https://images.unsplash.com/photo-1625246333195-78dbe9b43496?w=600&h=600&fit=crop",
  "Anti Infective Drugs & Medicines": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&h=600&fit=crop",
  "Agriculture Product Stocks": "https://images.unsplash.com/photo-1518977956812-c1673ef64296?w=600&h=600&fit=crop",
  "Cables/Cable Accessories & Conductors": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop",
  "Acrylic Fabric": "https://images.unsplash.com/photo-1558171813-1197032c3929?w=600&h=600&fit=crop",
};

const DEFAULT = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=600&fit=crop";

export function productImageUrl(product, size = 600) {
  const imgs = Array.isArray(product?.images) ? product.images : [];
  if (imgs.length && imgs[0]) return imgs[0];
  const name = product?.name;
  const cat = product?.category?.name;
  const parent = product?.category?.parent?.name;
  if (name && PRODUCT_IMAGES[name]) return PRODUCT_IMAGES[name].replace("w=600", `w=${size}`);
  if (cat && SUBCATEGORY_IMAGES[cat]) return SUBCATEGORY_IMAGES[cat].replace("w=600", `w=${size}`);
  if (parent && CATEGORY_IMAGES[parent]) return CATEGORY_IMAGES[parent].replace("w=600", `w=${size}`);
  // Match parent category name from nested include if available
  for (const [k, url] of Object.entries(CATEGORY_IMAGES)) {
    if (cat && cat.toLowerCase().includes(k.toLowerCase().split(" ")[0])) return url;
  }
  return DEFAULT.replace("w=600", `w=${size}`);
}

export function categoryImageUrl(categoryName, size = 400) {
  return (CATEGORY_IMAGES[categoryName] || DEFAULT).replace("h=600", `h=${size}`).replace("h=400", `h=${size}`);
}
