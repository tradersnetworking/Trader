import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { investPath } from "../../lib/site.js";
import { inr, dateStr } from "../../lib/format.js";
import { Alert } from "../../components/ui.jsx";
import { useI18n } from "../../lib/i18n/context.jsx";

export default function VerifyCertificatePage() {
  const { t } = useI18n();
  const [sp] = useSearchParams();
  const token = sp.get("token") || "";
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setErr(t("certificate.missingToken"));
      setLoading(false);
      return;
    }
    fetch(`/api/invest/public/verify-certificate?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !d.valid) throw new Error(d.error || "Invalid certificate");
        setData(d);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token, t]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="card p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-700">AKASHYA INVESTMENTS</p>
        <h1 className="mt-2 text-2xl font-bold">{t("certificate.verifyTitle")}</h1>

        {loading && <p className="mt-6 text-sm text-muted-foreground">{t("certificate.verifying")}</p>}
        {err && <Alert type="error">{err}</Alert>}

        {data && (
          <div className="mt-6 space-y-3 text-left text-sm">
            <div className="rounded-lg bg-emerald-500/10 px-4 py-3 text-center font-semibold text-emerald-700">✓ {t("certificate.authentic")}</div>
            {[
              ["Certificate No.", data.certificateNumber],
              ["Investor", data.investorName],
              ["Plan", data.planName],
              ["Amount", inr(data.amount)],
              ["Start", dateStr(data.startDate)],
              ["Maturity", dateStr(data.maturityDate)],
              ["Status", data.status],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-border/60 py-2">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        )}

        <Link to={investPath("")} className="btn-outline mt-6 inline-block">{t("certificate.backHome")}</Link>
      </div>
    </div>
  );
}
