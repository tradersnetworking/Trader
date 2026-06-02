import PDFDocument from "pdfkit";
import { createHash } from "crypto";
import { loadUploadImageBuffer } from "./agreementAssetHelper.js";

const BRAND = "AKASHYA INVESTMENTS";
const BRAND_GOLD = "#B8860B";
const INK = "#1A1A1A";
const MUTED = "#555555";
const BORDER = "#CCCCCC";
const MARGIN = 50;
const FOOTER_H = 36;
const HEADER_BODY_GAP = 10;

export async function generateAgreementPDF({ template, filledData, agreementUid, userName, signatureBase64 }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN + FOOTER_H, left: MARGIN, right: MARGIN },
      autoFirstPage: true,
      bufferPages: true,
      info: {
        Title: template.title,
        Author: BRAND,
        Subject: "Investment Agreement",
        Keywords: "investment agreement legal akshaya exim",
        CreationDate: new Date(),
      },
    });

    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => {
      const buffer = Buffer.concat(buffers);
      resolve({ buffer, hash: createHash("sha256").update(buffer).digest("hex") });
    });
    doc.on("error", reject);

    const contentWidth = doc.page.width - MARGIN * 2;
    let firstPageAdded = true;

    const fillPlaceholders = (text) => text.replace(/\{\{(\w+)\}\}/g, (_, key) => filledData[key] || `[${key}]`);
    const bottomLimit = () => doc.page.height - MARGIN - FOOTER_H;
    const syncPageCount = () => doc.bufferedPageRange();

    const stampPageFooters = () => {
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.font("Helvetica").fontSize(8).fillColor(MUTED);
        doc.text(`Page ${i + 1} of ${range.count}`, MARGIN, doc.page.height - MARGIN - 10, { width: contentWidth, align: "center", lineBreak: false });
      }
    };

    const drawRunningHeader = () => {
      const headerY = MARGIN - 8;
      doc.font("Helvetica-Bold").fontSize(10).fillColor(BRAND_GOLD);
      doc.text(BRAND.toUpperCase(), MARGIN, headerY, { width: contentWidth / 2, lineBreak: false });
      doc.font("Helvetica").fontSize(8).fillColor(MUTED);
      doc.text(filledData.AGREEMENT_DATE || new Date().toLocaleDateString("en-IN"), MARGIN, headerY, { width: contentWidth, align: "right", lineBreak: false });
      doc.font("Helvetica").fontSize(7).fillColor(MUTED);
      doc.text(`Ref: ${agreementUid}`, MARGIN, headerY + 12, { width: contentWidth / 2, lineBreak: false });
      doc.y = MARGIN + 22;
      doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + contentWidth, doc.y).lineWidth(0.5).stroke(BORDER);
      doc.y += HEADER_BODY_GAP;
    };

    doc.on("pageAdded", () => {
      syncPageCount();
      if (firstPageAdded) { firstPageAdded = false; return; }
      drawRunningHeader();
    });

    const startNewPage = () => { doc.addPage(); syncPageCount(); };
    const ensureLineSpace = (extra = 4) => {
      if (doc.y + doc.currentLineHeight(true) + extra > bottomLimit()) startNewPage();
    };

    const writeFlow = (text, opts = {}) => {
      const { font = "Helvetica", size = 9, color = INK, indent = 0, bold = false, gap = 4 } = opts;
      doc.font(bold ? `${font}-Bold` : font).fontSize(size).fillColor(color);
      doc.text(text, MARGIN + indent, doc.y, { width: contentWidth - indent, align: "left", lineGap: 3 });
      syncPageCount();
      doc.y += gap;
    };

    const writeKeyValue = (key, value) => {
      const labelW = 130;
      const val = value || "—";
      const rowH = Math.max(doc.heightOfString(val, { width: contentWidth - labelW - 8 }), 12) + 3;
      ensureLineSpace(rowH);
      const rowY = doc.y;
      doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(`${key}:`, MARGIN, rowY, { width: labelW });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK).text(val, MARGIN + labelW + 8, rowY, { width: contentWidth - labelW - 8 });
      doc.y = rowY + rowH;
    };

    const renderBodyLine = (trimmed) => {
      if (!trimmed) { doc.y += 4; return; }
      if (/^\([a-z0-9]\)/i.test(trimmed)) return writeFlow(trimmed, { size: 8.5, indent: 12, gap: 3 });
      if (trimmed.startsWith("-")) return writeFlow(`• ${trimmed.slice(1).trim()}`, { size: 8.5, indent: 12, gap: 3 });
      if (/^\d+\.\s/.test(trimmed)) return writeFlow(trimmed, { size: 9, bold: true, gap: 4 });
      if (trimmed.endsWith(":") && trimmed.length < 60 && !trimmed.includes(": ")) return writeFlow(trimmed, { size: 9, bold: true, color: BRAND_GOLD, gap: 3 });
      if (trimmed.includes(": ") && trimmed.split(":")[0].length < 36) {
        const i = trimmed.indexOf(": ");
        return writeKeyValue(trimmed.slice(0, i), trimmed.slice(i + 2));
      }
      writeFlow(trimmed, { size: 9, gap: 4 });
    };

    drawRunningHeader();
    doc.font("Helvetica-Bold").fontSize(13).fillColor(BRAND_GOLD);
    const titleH = doc.heightOfString(template.title, { width: contentWidth, align: "center" });
    if (doc.y + titleH + 16 > bottomLimit()) startNewPage();
    doc.text(template.title, MARGIN, doc.y, { width: contentWidth, align: "center", lineBreak: false });
    doc.y += titleH + 8;
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + contentWidth, doc.y).lineWidth(1).stroke(BRAND_GOLD);
    doc.y += 14;

    const photoPath = filledData.PASSPORT_PHOTO_PATH || filledData.AVATAR_PATH || "";
    const photoBuffer = photoPath && photoPath !== "—" ? loadUploadImageBuffer(photoPath) : null;
    const summaryFields = [
      ["Full Name", filledData.FULL_NAME || userName],
      ["Email", filledData.EMAIL],
      ["Mobile", filledData.MOBILE || filledData.INVESTOR_PHONE],
      ["Investor ID", filledData.INVESTOR_ID],
      ["KYC Status", filledData.KYC_STATUS],
      ["Agreement Date", filledData.AGREEMENT_DATE || new Date().toLocaleDateString("en-IN")],
      ["Agreement Ref", agreementUid],
    ];
    const photoBoxW = 70;
    const photoBoxH = 86;
    const summaryBoxH = Math.max(Math.ceil(summaryFields.length / 2) * 26 + 16, photoBuffer ? photoBoxH + 16 : 80);
    if (doc.y + summaryBoxH + 12 > bottomLimit()) startNewPage();
    const boxY = doc.y;
    doc.rect(MARGIN, boxY, contentWidth, summaryBoxH).lineWidth(0.5).stroke(BORDER);
    const innerX = photoBuffer ? MARGIN + photoBoxW + 14 : MARGIN + 10;
    const innerW = photoBuffer ? contentWidth - photoBoxW - 24 : contentWidth - 20;
    if (photoBuffer) {
      try { doc.image(photoBuffer, MARGIN + 8, boxY + 8, { width: photoBoxW - 4, height: photoBoxH - 4, fit: [photoBoxW - 4, photoBoxH - 4] }); } catch { /* skip */ }
    }
    const colW = innerW / 2 - 6;
    summaryFields.forEach(([label, value], i) => {
      const x = innerX + (i % 2) * (colW + 12);
      const y = boxY + 10 + Math.floor(i / 2) * 26;
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(label, x, y, { width: colW, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK).text(value || "—", x, y + 10, { width: colW, lineBreak: false });
    });
    doc.y = boxY + summaryBoxH + 12;
    writeFlow(`This document is generated by the ${BRAND} legal agreement system and is binding upon signature.`, { size: 8, color: MUTED, gap: 10 });

    template.sections.forEach((section, i) => {
      ensureLineSpace(28);
      writeFlow(`${i + 1}. ${section.heading}`, { size: 10, bold: true, color: BRAND_GOLD, gap: 4 });
      doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + contentWidth, doc.y).lineWidth(0.5).stroke(BORDER);
      doc.y += 8;
      fillPlaceholders(section.body).split("\n").forEach((line) => renderBodyLine(line.trim()));
      doc.y += 6;
    });

    ensureLineSpace(140);
    writeFlow("DIGITAL SIGNATURE & ACCEPTANCE", { size: 11, bold: true, color: BRAND_GOLD, gap: 6 });
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + contentWidth, doc.y).lineWidth(0.5).stroke(BRAND_GOLD);
    doc.y += 10;
    writeFlow(
      `By signing electronically, the undersigned confirms agreement to all terms above.\nRef: ${agreementUid} | Name: ${filledData.FULL_NAME || "—"} | Email: ${filledData.EMAIL || "—"}\nIP: ${filledData.IP_ADDRESS || "—"} | Device: ${filledData.DEVICE_INFO || "—"} | Timestamp: ${new Date().toISOString()}`,
      { size: 8, color: MUTED, gap: 12 }
    );

    const sigBoxW = contentWidth / 2 - 8;
    const sigBoxH = 70;
    const sigBoxY = doc.y;
    ensureLineSpace(sigBoxH + 20);
    doc.rect(MARGIN, sigBoxY, sigBoxW, sigBoxH).lineWidth(0.5).stroke(BORDER);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(BRAND_GOLD).text("INVESTOR SIGNATURE", MARGIN + 8, sigBoxY + 6, { lineBreak: false });
    if (signatureBase64) {
      try {
        const sigBuffer = Buffer.from(signatureBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
        doc.image(sigBuffer, MARGIN + 8, sigBoxY + 18, { width: sigBoxW - 16, height: 36, fit: [sigBoxW - 16, 36] });
      } catch { /* skip */ }
    }
    doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(filledData.FULL_NAME || userName || "Investor", MARGIN + 8, sigBoxY + sigBoxH - 14, { lineBreak: false });
    const boxRight = MARGIN + sigBoxW + 16;
    doc.rect(boxRight, sigBoxY, sigBoxW, sigBoxH).lineWidth(0.5).stroke(BORDER);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(BRAND_GOLD).text(`${BRAND.toUpperCase()} — Authorised Signatory`, boxRight + 8, sigBoxY + 6, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(BRAND_GOLD).text(BRAND, boxRight + 8, sigBoxY + 30, { lineBreak: false });
    doc.y = sigBoxY + sigBoxH + 14;

    const hashY = doc.y;
    if (hashY + 40 > bottomLimit()) startNewPage();
    doc.rect(MARGIN, doc.y, contentWidth, 32).lineWidth(0.5).stroke(BORDER);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BRAND_GOLD).text("VERIFICATION HASH (SHA-256):", MARGIN + 8, doc.y + 6, { lineBreak: false });
    doc.font("Courier").fontSize(7).fillColor(MUTED).text(filledData.PDF_HASH || "Generated upon signing", MARGIN + 8, doc.y + 18, { width: contentWidth - 16, lineBreak: false });
    doc.y += 40;
    writeFlow(`Tamper-evident digital document. Verify at ${filledData.SUPPORT_EMAIL || "support@akshayaexim.com"} with reference above.`, { size: 8, color: MUTED, gap: 0 });
    stampPageFooters();
    doc.end();
  });
}
