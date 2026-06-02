export const MAIN_SUPPORT_PHONE = "+91 99495 75426";
export const MAIN_SUPPORT_PHONE_TEL = "+919949575426";
export const MAIN_SUPPORT_WHATSAPP = "919949575426";
export const MAIN_SUPPORT_EMAIL = "info@akshayaexim.com";

export const DEFAULT_MAIN_CONTACT_PAGE = {
  intro: "Reach our trade desk for export, import, bulk quotes, buyer enquiries and payment support.",
  desks: [
    {
      id: "support",
      title: "Support, Buyers & Contact",
      email: MAIN_SUPPORT_EMAIL,
      phone: MAIN_SUPPORT_PHONE,
    },
  ],
  office: {
    name: "Akshaya Exim Traders",
    address: "Mumbai, Maharashtra, India",
    hours: "Mon–Sat, 9:00 AM – 7:00 PM IST",
    phone: MAIN_SUPPORT_PHONE,
    email: MAIN_SUPPORT_EMAIL,
  },
};

/** Public contact always uses unified support line (removes legacy multi-desk numbers). */
export function normalizePublicContact(contact) {
  const base = contact && typeof contact === "object" ? contact : DEFAULT_MAIN_CONTACT_PAGE;
  return {
    intro: base.intro || DEFAULT_MAIN_CONTACT_PAGE.intro,
    desks: DEFAULT_MAIN_CONTACT_PAGE.desks,
    office: {
      ...DEFAULT_MAIN_CONTACT_PAGE.office,
      ...(base.office || {}),
      phone: MAIN_SUPPORT_PHONE,
      email: base.office?.email || MAIN_SUPPORT_EMAIL,
    },
  };
}
