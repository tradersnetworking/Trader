import { useEffect, useState, useCallback } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Alert, Badge } from "../ui.jsx";
import { useAuth } from "../../lib/store.jsx";
import { buildReferralLink } from "../../lib/share.js";
import { copyTextToClipboard } from "../../lib/clipboard.js";
import { APP_PAGE_STACK, APP_STAT_GRID } from "../../lib/ui-system.js";
import KpiStatCard from "./InvestDashboardWidgets.jsx";
import ShareProfitButton from "./ShareProfitButton.jsx";
import { useI18n } from "../../lib/i18n/context.jsx";
import { useInvestRefresh } from "../../lib/investRefresh.js";

export default function ReferralPanel() {
  const { t } = useI18n();
  const { invest, refreshInvest } = useAuth();
  const [data, setData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    investApi("/referral/stats")
      .then((d) => {
        setData(d);
        refreshInvest();
      })
      .catch(() => {});
    fetch("/api/invest/public/referral/leaderboard")
      .then((r) => r.json())
      .then((d) => setLeaderboard(d.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshInvest]);

  useEffect(() => {
    load();
  }, [load]);
  useInvestRefresh(load);

  const code = data?.referralCode || invest?.referralCode || "";
  const link = code ? buildReferralLink(code) : "";

  const copyLink = async () => {
    if (!link) return;
    const ok = await copyTextToClipboard(link);
    if (ok) {
      setCopied(true);
      setMsg("Referral link copied!");
      setTimeout(() => {
        setCopied(false);
        setMsg("");
      }, 2000);
    } else {
      setMsg("Could not copy link — select the field and copy manually.");
    }
  };

  return (
    <div className={`${APP_PAGE_STACK} max-w-4xl`}>
      <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/15 via-primary/5 to-yellow-500/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-foreground">Referral Program</h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Invite friends to Akshaya Invest. Earn commission when they invest. Share your link on WhatsApp, Telegram & social media.
            </p>
          </div>
          <ShareProfitButton type="referral" amount="" label="Share program" />
        </div>
      </div>

      {msg && <Alert type="success">{msg}</Alert>}

      <div className={APP_STAT_GRID}>
        <KpiStatCard tone="amber" icon="👥" label="Total Referrals" value={data?.totalReferrals ?? "—"} loading={loading} />
        <KpiStatCard tone="emerald" icon="✓" label="Active Referrals" value={data?.activeReferrals ?? "—"} loading={loading} />
        <KpiStatCard tone="violet" icon="💰" label="Total Earnings" value={inr(data?.totalEarnings || 0)} loading={loading} />
        <KpiStatCard tone="blue" icon="⏳" label="Pending" value={inr(data?.pendingEarnings || 0)} loading={loading} />
      </div>

      {(data?.programSettings || data?.levelCommissions) && (
        <div className="card p-4">
          <h3 className="text-heading mb-2 text-sm font-bold">Program terms</h3>
          <div className="flex flex-wrap gap-2 mb-2">
            {(data.levelCommissions || data.programSettings?.levelCommissions || []).filter((l) => l.pct > 0).map((l) => (
              <span key={l.level} className="badge bg-primary/10 text-accent-tone">Level {l.level}: {l.pct}%</span>
            ))}
          </div>
          {data.programSettings && (
            <p className="text-xs text-muted-foreground">
              Payout: {{
                MANUAL: "Processed by admin",
                ON_INVEST: "Credited when your referral invests",
                WEEKLY: "Weekly batch payout",
                MONTHLY: "Monthly batch payout",
              }[data.programSettings.payoutFrequency] || data.programSettings.payoutFrequency}
              {data.programSettings.minPayout > 0 && ` · Minimum ₹${data.programSettings.minPayout}`}
            </p>
          )}
        </div>
      )}

      <div className="card p-5">
        <h3 className="text-heading mb-3 text-sm font-bold">Your referral link</h3>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <input className="input min-w-0 flex-1 font-mono text-xs" readOnly value={link} />
          <button type="button" className="btn-gold shrink-0" onClick={copyLink}>
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Referral code: <strong className="font-mono">{code || "—"}</strong> — new users can enter this at registration.
        </p>
      </div>

      <div className="card p-5">
        <h3 className="text-heading mb-3 text-sm font-bold">Referred investors</h3>
        {(data?.referredUsers || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No referrals yet. Share your link to get started.</p>
        ) : (
          <div className="space-y-2">
            {data.referredUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0">
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{dateStr(u.createdAt)}</div>
                </div>
                <Badge status="ACTIVE" />
              </div>
            ))}
          </div>
        )}
      </div>

      {leaderboard.length > 0 && (
        <div className="card p-5">
          <h3 className="text-heading mb-3 text-sm font-bold">{t("achievements.topReferrers")}</h3>
          <div className="space-y-2">
            {leaderboard.map((row) => (
              <div key={row.referrerId} className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-700">#{row.rank}</span>
                  <div>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.totalReferrals} referrals</div>
                  </div>
                </div>
                <span className="font-semibold text-emerald-600">{inr(row.totalEarnings)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="text-heading mb-3 text-sm font-bold">Referral earnings</h3>
        {(data?.earnings || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Earnings appear here when referred users invest.</p>
        ) : (
          <div className="space-y-2">
            {data.earnings.map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0">
                <div>
                  <div className="font-medium">{inr(e.amount)}</div>
                  <div className="text-xs text-muted-foreground">{e.note || dateStr(e.createdAt)}</div>
                </div>
                <Badge status={e.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
