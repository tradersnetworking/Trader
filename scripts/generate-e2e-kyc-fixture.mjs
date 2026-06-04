#!/usr/bin/env node
/** Writes e2e/fixtures/kyc-sample.jpg (≥1KB valid JPEG for server min-size check). */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "e2e", "fixtures");
const outJpg = path.join(dir, "kyc-sample.jpg");
const outPdf = path.join(dir, "kyc-sample.pdf");

const svg = `
<svg width="420" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#e8eef5"/>
  <text x="20" y="40" font-size="22" font-family="Arial" fill="#111">E2E KYC Test Document</text>
  <rect x="20" y="60" width="380" height="2" fill="#333"/>
  <text x="20" y="100" font-size="14" fill="#333">Sample PAN / ID upload for automated testing only.</text>
</svg>`;

await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(outJpg);

const pdfBody = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 420 300]/Parent 2 0 R/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 50 250 Td (E2E KYC TEST PDF) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
trailer<</Size 5/Root 1 0 R>>
startxref
300
%%EOF
${"X".repeat(2500)}`;
fs.writeFileSync(outPdf, pdfBody);

for (const out of [outJpg, outPdf]) {
  const size = fs.statSync(out).size;
  console.log(`Wrote ${out} (${size} bytes)`);
  if (size < 512) process.exit(1);
}
