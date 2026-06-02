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

function labelType(type) {
  const t = String(type || "").toUpperCase();
  const map = {
    DEPOSIT: "Deposit",
    INVESTMENT: "Investment",
    RETURN: "Return / ROI",
    PAYOUT: "Payout",
    ADJUSTMENT: "Adjustment",
    REFUND: "Refund",
    WITHDRAWAL: "Withdrawal",
  };
  return map[t] || type || "—";
}

export async function generateWalletStatementPdf({ investor, wallet, entries }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: "Wallet Statement",
        Author: BRAND_INVEST,
        Subject: "Account statement",
      },
    });

    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const contentWidth = doc.page.width - MARGIN * 2;
    const generatedAt = new Date();

    doc.font("Helvetica-Bold").fontSize(14).fillColor(BRAND_GOLD).text(BRAND_INVEST, MARGIN, MARGIN);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text("Wallet Account Statement", MARGIN, doc.y + 4);
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(`Generated: ${fmtDate(generatedAt)}`, MARGIN, doc.y + 6);
    doc.moveTo(MARGIN, doc.y + 10).lineTo(MARGIN + contentWidth, doc.y + 10).lineWidth(1).stroke(BRAND_GOLD);
    doc.y += 18;

    const summary = [
      ["Investor", investor?.name || "—"],
      ["Email", investor?.email || "—"],
      ["Investor ID", investor?.id?.slice(-12) || "—"],
      ["Available balance", fmtInr(wallet?.available)],
      ["Invested", fmtInr(wallet?.invested)],
      ["Earnings", fmtInr(wallet?.earnings)],
      ["Total balance", fmtInr((wallet?.available || 0) + (wallet?.invested || 0) + (wallet?.earnings || 0))],
    ];
    const boxH = summary.length * 18 + 16;
    doc.rect(MARGIN, doc.y, contentWidth, boxH).lineWidth(0.5).stroke(BORDER);
    let y = doc.y + 10;
    for (const [label, value] of summary) {
      doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(label, MARGIN + 10, y, { width: 120, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK).text(String(value), MARGIN + 130, y, {
        width: contentWidth - 140,
        lineBreak: false,
      });
      y += 18;
    }
    doc.y += boxH + 14;

    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text("Ledger entries (newest first)", MARGIN, doc.y);
    doc.y += 12;

    const col = {
      date: MARGIN,
      type: MARGIN + 108,
      dir: MARGIN + 168,
      amount: MARGIN + 218,
      balance: MARGIN + 298,
      note: MARGIN + 368,
    };
    const colW = { date: 100, type: 56, dir: 46, amount: 76, balance: 66, note: contentWidth - 320 };

    const drawHeader = () => {
      const hy = doc.y;
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(MUTED);
      doc.text("Date & time", col.date, hy, { width: colW.date, lineBreak: false });
      doc.text("Type", col.type, hy, { width: colW.type, lineBreak: false });
      doc.text("Dr/Cr", col.dir, hy, { width: colW.dir, lineBreak: false });
      doc.text("Amount", col.amount, hy, { width: colW.amount, lineBreak: false });
      doc.text("Balance", col.balance, hy, { width: colW.balance, lineBreak: false });
      doc.text("Note / reference", col.note, hy, { width: colW.note });
      doc.y = hy + 14;
      doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + contentWidth, doc.y).lineWidth(0.5).stroke(BORDER);
      doc.y += 6;
    };

    drawHeader();

    const rowH = 28;
    const bottom = () => doc.page.height - MARGIN - 24;

    for (const e of entries) {
      if (doc.y + rowH > bottom()) {
        doc.addPage();
        doc.y = MARGIN;
        drawHeader();
      }
      const ry = doc.y;
      const credit = e.direction === "CREDIT";
      doc.font("Helvetica").fontSize(7.5).fillColor(INK);
      doc.text(fmtDate(e.createdAt), col.date, ry, { width: colW.date, lineBreak: false });
      doc.text(labelType(e.type), col.type, ry, { width: colW.type, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(credit ? "#166534" : "#991B1B");
      doc.text(credit ? "CREDIT" : "DEBIT", col.dir, ry, { width: colW.dir, lineBreak: false });
      doc.text(fmtInr(e.amount), col.amount, ry, { width: colW.amount, lineBreak: false });
      doc.font("Helvetica").fontSize(7.5).fillColor(INK);
      doc.text(fmtInr(e.balanceAfter), col.balance, ry, { width: colW.balance, lineBreak: false });
      const noteLine = [e.note, e.reference].filter(Boolean).join(" · ") || "—";
      doc.text(noteLine.slice(0, 120), col.note, ry, { width: colW.note, lineGap: 1 });
      doc.y = ry + rowH;
    }

    if (!entries.length) {
      doc.font("Helvetica").fontSize(9).fillColor(MUTED).text("No ledger entries in this statement period.", MARGIN, doc.y);
    }

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
