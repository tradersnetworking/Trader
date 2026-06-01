/** Common dial codes for phone input — user can also type custom code. */
export const COUNTRY_CODES = [
  { code: "+91", country: "IN", label: "India (+91)" },
  { code: "+1", country: "US", label: "United States (+1)" },
  { code: "+44", country: "GB", label: "United Kingdom (+44)" },
  { code: "+971", country: "AE", label: "UAE (+971)" },
  { code: "+966", country: "SA", label: "Saudi Arabia (+966)" },
  { code: "+65", country: "SG", label: "Singapore (+65)" },
  { code: "+61", country: "AU", label: "Australia (+61)" },
  { code: "+49", country: "DE", label: "Germany (+49)" },
  { code: "+33", country: "FR", label: "France (+33)" },
  { code: "+81", country: "JP", label: "Japan (+81)" },
  { code: "+86", country: "CN", label: "China (+86)" },
  { code: "+82", country: "KR", label: "South Korea (+82)" },
  { code: "+60", country: "MY", label: "Malaysia (+60)" },
  { code: "+62", country: "ID", label: "Indonesia (+62)" },
  { code: "+66", country: "TH", label: "Thailand (+66)" },
  { code: "+84", country: "VN", label: "Vietnam (+84)" },
  { code: "+92", country: "PK", label: "Pakistan (+92)" },
  { code: "+880", country: "BD", label: "Bangladesh (+880)" },
  { code: "+94", country: "LK", label: "Sri Lanka (+94)" },
  { code: "+977", country: "NP", label: "Nepal (+977)" },
  { code: "+27", country: "ZA", label: "South Africa (+27)" },
  { code: "+234", country: "NG", label: "Nigeria (+234)" },
  { code: "+254", country: "KE", label: "Kenya (+254)" },
  { code: "+55", country: "BR", label: "Brazil (+55)" },
  { code: "+52", country: "MX", label: "Mexico (+52)" },
  { code: "+34", country: "ES", label: "Spain (+34)" },
  { code: "+39", country: "IT", label: "Italy (+39)" },
  { code: "+31", country: "NL", label: "Netherlands (+31)" },
  { code: "+7", country: "RU", label: "Russia (+7)" },
  { code: "+90", country: "TR", label: "Turkey (+90)" },
];

export const KYC_COUNTRIES = [
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "SG", label: "Singapore" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "CN", label: "China" },
  { code: "JP", label: "Japan" },
  { code: "OTHER", label: "Other country" },
];

export function isIndiaCountry(country) {
  const c = String(country || "").toUpperCase();
  return c === "IN" || c === "INDIA" || c === "IND";
}

export function formatFullPhone(countryCode, phone) {
  const cc = (countryCode || "+91").trim();
  const p = (phone || "").replace(/\s+/g, "");
  if (!p) return "";
  if (p.startsWith("+")) return p;
  return `${cc}${p.replace(/^0+/, "")}`;
}
