import PDFDocument from "pdfkit";
import { BRAND_INVEST } from "../data/brand.js";

const BRAND_GOLD = "#B8860B";
const INK = "#1A1A1A";
const MUTED = "#555555";
const BORDER = "#CCCCCC";
const MARGIN = 48;

function fmtInr(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * @param {object} opts
 * @param {string} opts.title - e.g. "Deposit Receipt"
 * @param {string} opts.receiptNo
 * @param {string} [opts.status]
 * @param {object} opts.investor
 * @param {[string, string][]} opts.lines
 */
export async function generateTransactionalReceiptPdf({ title, receiptNo, status, investor, lines = [] }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: title,
        Author: BRAND_INVEST,
        Subject: "Transaction receipt",
      },
    });

    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const contentWidth = doc.page.width - MARGIN * 2;
    const generatedAt = new Date();

    doc.font("Helvetica-Bold").fontSize(14).fillColor(BRAND_GOLD).text(BRAND_INVEST, MARGIN, MARGIN);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text(title, MARGIN, doc.y + 4);
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(`Receipt No: ${receiptNo || "—"}`, MARGIN, doc.y + 6);
    doc.text(`Generated: ${fmtDate(generatedAt)}`, MARGIN, doc.y + 2);
    doc.moveTo(MARGIN, doc.y + 10).lineTo(MARGIN + contentWidth, doc.y + 10).lineWidth(1).stroke(BRAND_GOLD);
    doc.y += 18;

    const investorLines = [
      ["Investor", investor?.name || "—"],
      ["Email", investor?.email || "—"],
      ["Investor ID", investor?.id?.slice(-12) || "—"],
    ];
    if (status) investorLines.push(["Status", status]);

    const boxH = investorLines.length * 18 + 16;
    doc.rect(MARGIN, doc.y, contentWidth, boxH).lineWidth(0.5).stroke(BORDER);
    let y = doc.y + 10;
    for (const [label, value] of investorLines) {
      doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(label, MARGIN + 10, y, { width: 120, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK).text(String(value), MARGIN + 130, y, {
        width: contentWidth - 140,
        lineBreak: false,
      });
      y += 18;
    }
    doc.y += boxH + 14;

    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text("Transaction details", MARGIN, doc.y);
    doc.y += 12;

    const detailH = lines.length * 20 + 16;
    doc.rect(MARGIN, doc.y, contentWidth, detailH).lineWidth(0.5).stroke(BORDER);
    y = doc.y + 10;
    for (const [label, value] of lines) {
      doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(label, MARGIN + 10, y, { width: 140, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(String(value ?? "—"), MARGIN + 150, y, {
        width: contentWidth - 160,
      });
      y += 20;
    }
    doc.y += detailH + 20;

    doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(
      "This is a computer-generated receipt from AKSHYA INVESTMENTS. For support, contact support@akshayaexim.in.",
      MARGIN,
      doc.y,
      { width: contentWidth, align: "left" }
    );

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.font("Helvetica").fontSize(7).fillColor(MUTED);
      doc.text(
        `Page ${i + 1} of ${range.count} · ${BRAND_INVEST} · Confidential`,
        MARGIN,
        doc.page.height - MARGIN + 8,
        { width: contentWidth, align: "center", lineBreak: false }
      );
    }

    doc.end();
  });
}
