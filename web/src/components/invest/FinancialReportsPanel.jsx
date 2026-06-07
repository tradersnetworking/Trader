import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Alert } from "../ui.jsx";
import { useI18n } from "../../lib/i18n/context.jsx";

export function FinancialReportsPanel() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    investApi("/admin/financial-reports")
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <Alert type="error">{err}</Alert>;
  if (!data) return <p className="text-sm text-muted-foreground">{t("financial.loading")}</p>;

  const s = data.summary;
  const pl = data.profitAndLoss;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground">{t("financial.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("financial.subtitle").replace("{date}", dateStr(data.generatedAt))}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["depositsApproved", s.depositsApproved],
          ["payoutsReleased", s.payoutsReleased],
          ["roiPaid", s.roiPaidTotal],
          ["referralPaid", s.referralPaid],
          ["walletAvailable", s.walletAvailable],
          ["walletInvested", s.walletInvested],
          ["activeAum", s.activeInvested],
          ["payoutsPending", s.payoutsPending],
        ].map(([key, value]) => (
          <div key={key} className="card p-4">
            <div className="text-xs text-muted-foreground">{t(`financial.${key}`)}</div>
            <div className="text-xl font-bold">{inr(value || 0)}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h4 className="mb-3 font-bold">{t("financial.plTitle")}</h4>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">{t("financial.incomeLine")}</dt><dd className="font-semibold text-emerald-600">{inr(pl.incomeLine)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">{t("financial.expenseLine")}</dt><dd className="font-semibold text-rose-600">{inr(pl.expenseLine)}</dd></div>
          <div className="flex justify-between border-t border-border pt-2"><dt className="font-medium">{t("financial.netPosition")}</dt><dd className="font-bold">{inr(pl.netPosition)}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">{pl.note}</p>
      </div>

      <div className="app-table-wrap card p-5">
        <h4 className="mb-3 font-bold">{t("financial.trialBalance")}</h4>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr><th className="pb-2 pr-4">{t("financial.colType")}</th><th className="pb-2 pr-4">{t("financial.colDirection")}</th><th className="pb-2 pr-4">{t("financial.colEntries")}</th><th className="pb-2">{t("financial.colTotal")}</th></tr>
          </thead>
          <tbody>
            {data.trialBalance.map((row) => (
              <tr key={`${row.type}-${row.direction}`} className="border-t border-border">
                <td className="py-2 pr-4 font-mono text-xs">{row.type}</td>
                <td className="py-2 pr-4">{row.direction}</td>
                <td className="py-2 pr-4">{row.count}</td>
                <td className={`py-2 font-semibold ${row.direction === "CREDIT" ? "text-emerald-600" : "text-rose-600"}`}>
                  {row.direction === "CREDIT" ? "+" : "−"}{inr(row.total)}
                </td>
              </tr>
            ))}
            {data.trialBalance.length === 0 && (
              <tr><td colSpan="4" className="py-4 text-center text-muted-foreground">{t("financial.noEntries")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
