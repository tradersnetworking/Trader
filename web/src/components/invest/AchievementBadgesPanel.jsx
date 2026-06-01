import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr } from "../../lib/format.js";
import { useI18n } from "../../lib/i18n/context.jsx";
import AchievementShareCard from "./AchievementShareCard.jsx";

export default function AchievementBadgesPanel({ compact = false }) {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareTarget, setShareTarget] = useState(null);

  useEffect(() => {
    investApi("/achievements")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (!data) return null;

  const items = data.unlocked?.length
    ? data.unlocked
    : [{ id: "none", label: t("achievements.noBadges"), icon: "🎯", description: t("achievements.noBadgesHint") }];

  return (
    <div className={compact ? "space-y-3" : "card p-5 space-y-4"}>
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-foreground">{t("achievements.title")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("achievements.unlocked").replace("{count}", data.unlockedCount)} · {inr(data.totalInvested)} {t("achievements.totalInvested")}
            </p>
          </div>
        </div>
      )}

      <div className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {items.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={a.id === "none" || !a.unlocked}
            onClick={() => a.unlocked && setShareTarget(a)}
            className={`rounded-xl border p-3 text-left transition ${
              a.unlocked
                ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-primary/5 hover:shadow-md"
                : "border-border bg-muted/30 opacity-60"
            }`}
          >
            <div className="text-2xl">{a.icon}</div>
            <div className="mt-1 text-sm font-bold text-foreground">{a.label}</div>
            {a.description && <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{a.description}</p>}
            {a.unlocked && a.id !== "none" && (
              <p className="mt-2 text-[10px] font-semibold text-amber-700 dark:text-amber-400">{t("achievements.tapToShare")}</p>
            )}
          </button>
        ))}
      </div>

      {!compact && data.milestones?.some((m) => !m.unlocked) && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("achievements.nextMilestones")}</h4>
          <div className="space-y-2">
            {data.milestones
              .filter((m) => !m.unlocked)
              .slice(0, 3)
              .map((m) => (
                <div key={m.id} className="rounded-lg bg-muted/40 px-3 py-2">
                  <div className="flex justify-between text-xs">
                    <span>{m.icon} {m.label}</span>
                    <span className="text-muted-foreground">{m.progress}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${m.progress}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {shareTarget && (
        <AchievementShareCard
          achievement={shareTarget}
          totalInvested={data.totalInvested}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
