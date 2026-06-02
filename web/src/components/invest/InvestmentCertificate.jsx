import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { inr, dateStr } from "../../lib/format.js";

export default function InvestmentCertificate({ data, onClose }) {
  const printRef = useRef(null);
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (!data?.verifyUrl) return;
    QRCode.toDataURL(data.verifyUrl, { width: 120, margin: 1 }).then(setQrUrl).catch(() => {});
  }, [data?.verifyUrl]);

  if (!data) return null;

  const print = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html><head><title>Certificate ${data.certificateNumber}</title>
      <style>
        body { font-family: Georgia, serif; margin: 0; padding: 24px; color: #002366; }
        .cert { border: 4px double #c9a227; padding: 32px; max-width: 720px; margin: 0 auto; }
        h1 { text-align: center; font-size: 28px; margin: 0 0 8px; }
        .sub { text-align: center; color: #666; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; }
        .label { color: #666; font-size: 11px; text-transform: uppercase; }
        .qr { text-align: center; margin-top: 24px; }
        .foot { text-align: center; font-size: 11px; color: #888; margin-top: 20px; }
      </style></head><body>${printRef.current?.innerHTML || ""}
      <script>window.onload=function(){window.print();}</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div ref={printRef} className="cert-print border-4 border-double border-amber-500/60 p-6 sm:p-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700">AKSHYA INVESTMENTS</p>
            <h1 className="mt-2 text-2xl font-bold text-[#002366] dark:text-white">Investment Certificate</h1>
            <p className="text-sm text-muted-foreground">Certificate No. {data.certificateNumber}</p>
          </div>

          <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground">
            This certifies that <strong className="text-foreground">{data.investorName}</strong> has subscribed to the investment plan detailed below on the AKSHYA INVESTMENTS portal (INR).
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Plan", data.planName],
              ["Plan tier", data.planType],
              ["Investment amount", inr(data.amount)],
              ["Monthly ROI", `${data.monthlyRoiPct}%`],
              ["Annual ROI", `${data.annualRoiPct}%`],
              ["Lock-in", `${data.lockInDays} days`],
              ["Settlement", data.settlementCycle],
              ["Start date", dateStr(data.startDate)],
              ["Maturity date", dateStr(data.maturityDate)],
              ["Status", data.status],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="font-semibold text-foreground">{value}</div>
              </div>
            ))}
          </div>

          {qrUrl && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <img src={qrUrl} alt="Verification QR" className="h-28 w-28" />
              <p className="max-w-xs break-all text-center text-[10px] text-muted-foreground">{data.verifyUrl}</p>
            </div>
          )}

          <p className="mt-4 text-center text-[10px] text-muted-foreground">
            Scan QR or visit the verify URL to confirm authenticity. Issued {dateStr(data.issuedAt)} · invest.akshayaexim.com
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-gold flex-1" onClick={print}>Print / Save as PDF</button>
          <button type="button" className="btn-outline flex-1" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
