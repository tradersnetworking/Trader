/**
 * B2B EXIM marketplace catalog for akshayaexim.com / akshayaexim.in
 * Structure: top-level category → subcategory → product listings (seeded as Product rows).
 */

export const BULK_QUANTITY_UNITS = [
  "Kg",
  "MT",
  "Quintal",
  "Bag",
  "Sack",
  "Drum",
  "Barrel",
  "Container",
  "Truck Load",
  "Pallet",
  "Carton",
  "Box",
  "Piece",
  "Roll",
  "Bundle",
];

/** @typedef {{ name: string, products: string[], unit?: string, listingType?: "EXPORT"|"IMPORT" }} SubCategory */
/** @typedef {{ name: string, sub: SubCategory[], defaultUnit?: string }} TopCategory */

/** @type {TopCategory[]} */
export const TAXONOMY = [
  {
    name: "Agriculture & Food Products",
    defaultUnit: "MT",
    sub: [
      {
        name: "Food Grains",
        products: [
          "Rice (Basmati, Non-Basmati)",
          "Wheat",
          "Maize (Corn)",
          "Barley",
          "Sorghum",
          "Millet",
          "Oats",
          "Rye",
          "Quinoa",
          "Buckwheat",
        ],
      },
      {
        name: "Pulses & Lentils",
        products: [
          "Chickpeas",
          "Green Gram",
          "Black Gram",
          "Red Lentils",
          "Yellow Peas",
          "Pigeon Peas",
          "Kidney Beans",
          "White Beans",
          "Soybeans",
          "Cowpeas",
        ],
      },
      {
        name: "Oil Seeds",
        products: [
          "Mustard Seeds",
          "Sesame Seeds",
          "Sunflower Seeds",
          "Flax Seeds",
          "Safflower Seeds",
          "Castor Seeds",
          "Groundnut",
          "Soybean Seeds",
          "Cotton Seeds",
          "Niger Seeds",
        ],
      },
      {
        name: "Spices",
        products: [
          "Turmeric",
          "Red Chilli",
          "Green Chilli",
          "Black Pepper",
          "White Pepper",
          "Cardamom",
          "Cinnamon",
          "Cloves",
          "Nutmeg",
          "Mace",
          "Coriander",
          "Cumin",
          "Fennel",
          "Fenugreek",
          "Bay Leaves",
          "Star Anise",
          "Saffron",
          "Ginger",
          "Garlic",
          "Tamarind",
        ],
      },
      {
        name: "Fresh Vegetables",
        products: [
          "Onion",
          "Garlic",
          "Ginger",
          "Potato",
          "Tomato",
          "Capsicum",
          "Cucumber",
          "Carrot",
          "Beetroot",
          "Cabbage",
          "Cauliflower",
          "Green Peas",
          "Drumstick",
          "Okra",
          "Pumpkin",
          "Sweet Potato",
        ],
      },
      {
        name: "Fresh Fruits",
        products: [
          "Mango",
          "Banana",
          "Apple",
          "Orange",
          "Lemon",
          "Pomegranate",
          "Grapes",
          "Guava",
          "Papaya",
          "Pineapple",
          "Watermelon",
          "Muskmelon",
          "Dragon Fruit",
          "Avocado",
          "Coconut",
        ],
      },
      {
        name: "Dry Fruits & Nuts",
        products: [
          "Almonds",
          "Cashews",
          "Pistachios",
          "Walnuts",
          "Hazelnuts",
          "Pecans",
          "Brazil Nuts",
          "Dried Figs",
          "Dates",
          "Raisins",
          "Apricots",
          "Prunes",
        ],
      },
      {
        name: "Plantation Products",
        products: [
          "Coffee Beans",
          "Tea",
          "Cocoa Beans",
          "Copra",
          "Areca Nut",
          "Rubber Sheets",
          "Vanilla Beans",
        ],
      },
    ],
  },
  {
    name: "Seeds Category",
    defaultUnit: "Quintal",
    sub: [
      {
        name: "Agricultural Seeds",
        products: [
          "Paddy Seeds",
          "Wheat Seeds",
          "Maize Seeds",
          "Cotton Seeds",
          "Mustard Seeds",
          "Soybean Seeds",
          "Groundnut Seeds",
          "Sunflower Seeds",
        ],
      },
      {
        name: "Vegetable Seeds",
        products: [
          "Tomato Seeds",
          "Chilli Seeds",
          "Onion Seeds",
          "Capsicum Seeds",
          "Cucumber Seeds",
          "Watermelon Seeds",
          "Pumpkin Seeds",
        ],
      },
      {
        name: "Fruit Seeds",
        products: [
          "Papaya Seeds",
          "Pomegranate Seeds",
          "Dragon Fruit Seeds",
        ],
      },
    ],
  },
  {
    name: "Organic Products",
    defaultUnit: "MT",
    sub: [
      {
        name: "Organic Food",
        products: [
          "Organic Rice",
          "Organic Wheat",
          "Organic Pulses",
          "Organic Spices",
          "Organic Tea",
          "Organic Coffee",
        ],
      },
      {
        name: "Organic Inputs",
        products: [
          "Vermicompost",
          "Organic Fertilizers",
          "Bio Fertilizers",
          "Bio Pesticides",
          "Neem Cake",
          "Seaweed Extract",
        ],
      },
    ],
  },
  {
    name: "Ayurvedic & Herbal Products",
    defaultUnit: "Kg",
    sub: [
      {
        name: "Raw Herbs",
        products: [
          "Ashwagandha",
          "Tulsi",
          "Neem",
          "Aloe Vera",
          "Brahmi",
          "Shatavari",
          "Giloy",
          "Amla",
          "Arjuna",
          "Moringa",
        ],
      },
      {
        name: "Processed Herbal Products",
        products: [
          "Herbal Extracts",
          "Ayurvedic Oils",
          "Herbal Powders",
          "Herbal Capsules",
          "Herbal Tea",
          "Medicinal Plant Extracts",
        ],
      },
      {
        name: "Essential Oils",
        unit: "Drum",
        products: [
          "Peppermint Oil",
          "Eucalyptus Oil",
          "Lemongrass Oil",
          "Lavender Oil",
          "Tea Tree Oil",
          "Sandalwood Oil",
          "Clove Oil",
          "Cinnamon Oil",
          "Basil Oil",
          "Citronella Oil",
        ],
      },
    ],
  },
  {
    name: "Coconut & Fiber Products",
    defaultUnit: "MT",
    sub: [
      {
        name: "Coconut Products",
        products: [
          "Fresh Coconut",
          "Copra",
          "Coconut Oil",
          "Virgin Coconut Oil",
          "Coconut Water",
          "Coconut Milk Powder",
          "Desiccated Coconut",
        ],
      },
      {
        name: "Coir Products",
        unit: "Bundle",
        products: [
          "Coir Fiber",
          "Coir Yarn",
          "Coir Rope",
          "Coir Mats",
          "Coir Geo Textiles",
          "Coco Peat",
        ],
      },
    ],
  },
  {
    name: "Cotton & Jute Products",
    defaultUnit: "MT",
    sub: [
      {
        name: "Cotton",
        products: [
          "Raw Cotton",
          "Cotton Yarn",
          "Cotton Linter",
          "Cotton Waste",
          "Cotton Fabric",
        ],
      },
      {
        name: "Jute",
        unit: "Roll",
        products: [
          "Raw Jute",
          "Jute Fiber",
          "Jute Yarn",
          "Jute Bags",
          "Jute Fabric",
        ],
      },
    ],
  },
  {
    name: "Medical & Surgical Products",
    defaultUnit: "Carton",
    sub: [
      {
        name: "Surgical Consumables",
        products: [
          "Surgical Gloves",
          "Syringes",
          "IV Sets",
          "Catheters",
          "Cannulas",
          "Surgical Masks",
          "Surgical Gowns",
          "Bandages",
          "Cotton Rolls",
          "Gauze",
        ],
      },
      {
        name: "Medical Equipment",
        unit: "Piece",
        products: [
          "Patient Monitors",
          "ECG Machines",
          "Ventilators",
          "Hospital Beds",
          "Wheelchairs",
          "Defibrillators",
          "Infusion Pumps",
        ],
      },
      {
        name: "Diagnostics",
        products: [
          "Rapid Test Kits",
          "Blood Collection Tubes",
          "Laboratory Reagents",
          "Diagnostic Devices",
        ],
      },
      {
        name: "Hospital Furniture",
        unit: "Piece",
        products: [
          "Hospital Beds",
          "Wheelchairs",
          "Stretchers",
          "Bedside Lockers",
          "IV Stands",
        ],
      },
    ],
  },
  {
    name: "Chemicals",
    defaultUnit: "MT",
    sub: [
      {
        name: "Acids",
        unit: "Drum",
        products: [
          "Sulphuric Acid",
          "Hydrochloric Acid",
          "Nitric Acid",
          "Acetic Acid",
          "Phosphoric Acid",
          "Citric Acid",
        ],
      },
      {
        name: "Alkalis & Bases",
        unit: "Drum",
        products: [
          "Caustic Soda",
          "Potassium Hydroxide",
          "Soda Ash",
          "Ammonia Solution",
        ],
      },
      {
        name: "Salts",
        products: [
          "Sodium Chloride",
          "Potassium Chloride",
          "Calcium Chloride",
          "Magnesium Sulphate",
          "Sodium Sulphate",
        ],
      },
      {
        name: "Industrial Chemicals",
        unit: "Drum",
        products: [
          "Hydrogen Peroxide",
          "Ethanol",
          "Methanol",
          "Isopropyl Alcohol",
          "Acetone",
          "Formaldehyde",
        ],
      },
      {
        name: "Fertilizer Chemicals",
        products: [
          "Urea",
          "DAP",
          "MOP",
          "NPK Fertilizers",
          "Ammonium Sulphate",
        ],
      },
    ],
  },
  {
    name: "Ores & Minerals",
    defaultUnit: "MT",
    sub: [
      {
        name: "Iron Ore",
        products: ["Iron Ore Fines", "Iron Ore Lumps"],
      },
      {
        name: "Copper Ore",
        products: ["Copper Concentrates", "Copper Ore"],
      },
      {
        name: "Aluminum Ore",
        products: ["Bauxite Ore", "Alumina"],
      },
      {
        name: "Zinc Ore",
        products: ["Zinc Concentrates", "Zinc Ore"],
      },
      {
        name: "Other Minerals",
        products: [
          "Manganese Ore",
          "Chromite Ore",
          "Nickel Ore",
          "Lead Ore",
          "Limestone",
          "Gypsum",
          "Silica Sand",
          "Bentonite",
        ],
      },
    ],
  },
  {
    name: "Metals",
    defaultUnit: "MT",
    sub: [
      {
        name: "Ferrous Metals",
        products: [
          "Iron",
          "Steel Billets",
          "Steel Coils",
          "Stainless Steel",
          "Alloy Steel",
        ],
      },
      {
        name: "Non-Ferrous Metals",
        products: [
          "Copper Cathodes",
          "Aluminum Ingots",
          "Zinc Ingots",
          "Nickel",
          "Lead",
          "Tin",
          "Magnesium",
        ],
      },
    ],
  },
  {
    name: "Metal Scrap",
    defaultUnit: "MT",
    sub: [
      {
        name: "Ferrous Scrap",
        products: [
          "HMS 1",
          "HMS 2",
          "Shredded Scrap",
          "Rail Scrap",
          "Cast Iron Scrap",
        ],
      },
      {
        name: "Non-Ferrous Scrap",
        products: [
          "Copper Scrap",
          "Aluminum Scrap",
          "Brass Scrap",
          "Zinc Scrap",
          "Lead Scrap",
          "Stainless Steel Scrap",
        ],
      },
    ],
  },
  {
    name: "Generic Pharmaceutical Products",
    defaultUnit: "Box",
    sub: [
      {
        name: "Tablets",
        products: [
          "Paracetamol Tablets",
          "Ibuprofen Tablets",
          "Aspirin Tablets",
          "Cetirizine Tablets",
          "Loratadine Tablets",
          "Vitamin C Tablets",
          "Multivitamin Tablets",
          "Calcium Tablets",
          "Zinc Tablets",
          "Iron Tablets",
          "Folic Acid Tablets",
          "Antacid Tablets",
        ],
      },
      {
        name: "Capsules",
        products: [
          "Vitamin Capsules",
          "Omega-3 Capsules",
          "Probiotic Capsules",
          "Herbal Capsules",
          "Calcium Capsules",
          "Iron Capsules",
        ],
      },
      {
        name: "Syrups",
        products: [
          "Cough Syrup",
          "Multivitamin Syrup",
          "Iron Syrup",
          "Calcium Syrup",
          "Antacid Syrup",
          "Pediatric Nutritional Syrup",
        ],
      },
      {
        name: "Ointments & Creams",
        products: [
          "Antiseptic Cream",
          "Burn Relief Cream",
          "Moisturizing Cream",
          "Herbal Cream",
          "Pain Relief Gel",
          "Skin Care Cream",
          "Petroleum Jelly",
        ],
      },
      {
        name: "Oral Care Products",
        products: [
          "Toothpaste",
          "Mouthwash",
          "Dental Floss",
          "Denture Cleaning Tablets",
        ],
      },
      {
        name: "First Aid Products",
        products: [
          "Antiseptic Solution",
          "Adhesive Bandages",
          "Sterile Gauze",
          "Cotton Wool",
          "Medical Tape",
          "First Aid Kits",
        ],
      },
    ],
  },
  {
    name: "Medical & Healthcare",
    defaultUnit: "Carton",
    sub: [
      {
        name: "Disposable Medical Products",
        products: [
          "Surgical Gloves",
          "Examination Gloves",
          "Face Masks",
          "N95 Masks",
          "Shoe Covers",
          "Head Caps",
          "Aprons",
          "Protective Gowns",
        ],
      },
      {
        name: "Hospital Consumables",
        products: [
          "Syringes",
          "Needles",
          "IV Cannulas",
          "IV Sets",
          "Urine Bags",
          "Blood Collection Tubes",
          "Specimen Containers",
          "Catheters",
        ],
      },
      {
        name: "Home Healthcare",
        unit: "Piece",
        products: [
          "Digital Thermometers",
          "Blood Pressure Monitors",
          "Pulse Oximeters",
          "Blood Glucose Monitors",
          "Weighing Scales",
        ],
      },
      {
        name: "Diagnostic Kits",
        products: [
          "Pregnancy Test Kits",
          "Rapid Diagnostic Test Kits",
          "Laboratory Reagents",
          "Sample Collection Swabs",
        ],
      },
      {
        name: "Health Supplements",
        unit: "Box",
        products: [
          "Protein Powder",
          "Whey Protein",
          "Multivitamins",
          "Omega-3 Supplements",
          "Probiotics",
          "Electrolyte Powder",
          "Energy Supplements",
        ],
      },
      {
        name: "Herbal Supplements",
        unit: "Kg",
        products: [
          "Ashwagandha Capsules",
          "Moringa Powder",
          "Spirulina Powder",
          "Amla Powder",
          "Giloy Extract",
          "Aloe Vera Products",
        ],
      },
      {
        name: "Basic Medical Devices",
        unit: "Piece",
        products: [
          "Stethoscopes",
          "Nebulizers",
          "Infrared Thermometers",
          "ECG Machines",
          "Patient Monitors",
          "Oxygen Concentrators",
          "Wheelchairs",
          "Hospital Beds",
        ],
      },
      {
        name: "Healthcare Supplies",
        products: [
          "Medical Tape",
          "Sterile Gauze",
          "Cotton Wool",
          "Bandages",
          "First Aid Kits",
          "Hand Sanitizer",
        ],
      },
    ],
  },
  {
    name: "Pharmaceutical & Biotech Trade",
    defaultUnit: "Kg",
    sub: [
      {
        name: "API Products",
        products: [
          "Paracetamol API",
          "Ibuprofen API",
          "Metformin API",
          "Amoxicillin API",
          "Azithromycin API",
        ],
      },
      {
        name: "Pharmaceutical Intermediates",
        products: [
          "Active Pharmaceutical Intermediates",
          "Bulk Drug Intermediates",
          "Fine Chemical Intermediates",
        ],
      },
      {
        name: "Medical Packaging Materials",
        unit: "Roll",
        products: [
          "Blister Packaging Film",
          "Aluminium Foil for Pharma",
          "Medical Grade PVC Film",
          "Pharma Cartons",
        ],
      },
      {
        name: "Laboratory Equipment",
        unit: "Piece",
        products: [
          "Laboratory Microscopes",
          "Centrifuges",
          "Laboratory Ovens",
          "Analytical Balances",
          "Laboratory Glassware Sets",
        ],
      },
      {
        name: "Veterinary Medicines",
        unit: "Box",
        products: [
          "Veterinary Antibiotics",
          "Veterinary Vaccines",
          "Veterinary Antiparasitics",
          "Veterinary Anti-inflammatory Medicines",
        ],
      },
      {
        name: "Veterinary Supplements",
        products: [
          "Animal Feed Supplements",
          "Mineral Mixtures for Livestock",
          "Poultry Feed Additives",
          "Aquaculture Feed Supplements",
        ],
      },
      {
        name: "Biotechnology Products",
        products: [
          "Enzymes",
          "Probiotics for Industrial Use",
          "Bio Cultures",
          "Fermentation Products",
        ],
      },
      {
        name: "Healthcare Raw Materials",
        products: [
          "Pharma Grade Excipients",
          "Lactose Monohydrate",
          "Microcrystalline Cellulose",
          "Pharma Grade Starch",
        ],
      },
    ],
  },
];

/** Resolve unit for a subcategory row. */
export function unitForSub(topCategory, subCategory) {
  return subCategory.unit || topCategory.defaultUnit || "MT";
}

/** Flat list of all catalog products for seeding / image scripts. */
export function flattenCatalogProducts() {
  const out = [];
  for (const top of TAXONOMY) {
    for (const sub of top.sub) {
      for (const name of sub.products) {
        out.push({
          name,
          parentCategory: top.name,
          subCategory: sub.name,
          unit: unitForSub(top, sub),
          listingType: sub.listingType || top.listingType || "EXPORT",
        });
      }
    }
  }
  return out;
}

/** Catalog statistics. */
export function getCatalogStats() {
  const top = TAXONOMY.length;
  const sub = TAXONOMY.reduce((n, c) => n + c.sub.length, 0);
  const products = flattenCatalogProducts().length;
  return { topCategories: top, subCategories: sub, products };
}
