/** Convert INR amount to words (Indian numbering — lakh, crore). */
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function underThousand(n) {
  if (n === 0) return "";
  if (n < 20) return ones[n];
  if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`.trim();
  const h = Math.floor(n / 100);
  const rem = n % 100;
  return `${ones[h]} Hundred${rem ? ` ${underThousand(rem)}` : ""}`.trim();
}

function inrWords(n) {
  const num = Math.floor(Math.abs(Number(n) || 0));
  if (num === 0) return "Zero";
  const parts = [];
  let rest = num;
  const crore = Math.floor(rest / 10000000);
  if (crore) { parts.push(`${underThousand(crore)} Crore`); rest %= 10000000; }
  const lakh = Math.floor(rest / 100000);
  if (lakh) { parts.push(`${underThousand(lakh)} Lakh`); rest %= 100000; }
  const thousand = Math.floor(rest / 1000);
  if (thousand) { parts.push(`${underThousand(thousand)} Thousand`); rest %= 1000; }
  if (rest) parts.push(underThousand(rest));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function amountToInrWords(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return "—";
  const whole = Math.floor(num);
  const paise = Math.round((num - whole) * 100);
  let words = `${inrWords(whole)} Rupees`;
  if (paise) words += ` and ${inrWords(paise)} Paise`;
  return words;
}
