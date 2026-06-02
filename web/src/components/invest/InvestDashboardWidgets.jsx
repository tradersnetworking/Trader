import { KPI_TONES } from "../../lib/invest-dashboard-ui.js";
import { UserAvatar } from "../ui.jsx";
import { NavIcon } from "./NavIcons.jsx";
import { navIconBg, navIconFg } from "../../lib/invest-nav.js";

export default function KpiStatCard({ label, value, subValue, icon, tone = "blue", onClick, href, loading }) {
  const t = KPI_TONES[tone] || KPI_TONES.blue;
  const inner = (
    <div
      className={`card overflow-hidden border ${t.border} transition hover:shadow-md ${onClick || href ? "cursor-pointer active:scale-[0.99]" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${t.bar}`} />
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          {icon && <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${t.bg}`}>{icon}</span>}
        </div>
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <p className={`kpi-stat-value break-words ${t.value}`}>{value ?? "—"}</p>
        )}
        {subValue && !loading && <p className="mt-1 text-xs text-muted-foreground">{subValue}</p>}
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} onClick={(e) => { e.preventDefault(); onClick?.(); }} className="block no-underline">
        {inner}
      </a>
    );
  }
  return inner;
}

export function WelcomeBanner({ name, subtitle, profilePicture, gradient = true }) {
  const user = { name, profilePicture };
  return (
    <div className={`overflow-hidden rounded-2xl border border-primary/20 ${gradient ? "bg-gradient-to-r from-primary/10 via-card to-yellow-500/5 dark:from-primary/10 dark:via-card dark:to-yellow-600/5" : "card"} p-5 sm:p-6`}>
      <div className="flex items-center gap-4">
        <UserAvatar user={user} size={56} className="hidden sm:inline-flex" />
        <UserAvatar user={user} size={48} className="sm:hidden" />
        <div className="min-w-0">
          <h2 className="text-xl font-black tracking-tight sm:text-2xl">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent">
              {name?.split(" ")[0] || "Investor"}
            </span>
          </h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export function QuickActionGrid({ actions }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card/80 p-3 text-center transition hover:border-primary/40 hover:bg-primary/5"
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${navIconBg(a.color || "blue")}`}>
            {typeof a.icon === "string" && /^[a-z]+$/.test(a.icon) ? (
              <NavIcon name={a.icon} className={`h-5 w-5 ${navIconFg(a.color || "blue")}`} />
            ) : (
              <span className="text-lg">{a.icon}</span>
            )}
          </span>
          <span className="text-xs font-semibold text-foreground">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

export function AllocationBars({ items, totalLabel = "Total" }) {
  const total = items.reduce((n, i) => n + (i.value || 0), 0) || 1;
  return (
    <div className="space-y-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
        {items.map((item) => (
          <div
            key={item.key || item.label}
            style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.color }}
            title={`${item.label}: ${item.value}`}
          />
        ))}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.key || item.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-slate-500">{item.label}</span>
            </div>
            <b className="text-navy dark:text-white">{item.display || item.value}</b>
          </div>
        ))}
      </div>
      {totalLabel && <p className="text-xs text-slate-400">{totalLabel}</p>}
    </div>
  );
}

export function PlanBreakdownChart({ plans, formatValue }) {
  const max = Math.max(...plans.map((p) => p.amount || 0), 1);
  return (
    <div className="space-y-3">
      {plans.map((p) => (
        <div key={p.planId || p.planType}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-navy dark:text-white">{p.name || p.planType}</span>
            <span className="text-slate-400">{p.count || 0} subs • {formatValue(p.amount || 0)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${((p.amount || 0) / max) * 100}%`, backgroundColor: p.color || "#d4a017" }}
            />
          </div>
        </div>
      ))}
      {plans.length === 0 && <p className="text-sm text-slate-400">No active investments yet.</p>}
    </div>
  );
}

const EVENT_KIND = {
  MATURITY: { icon: "📅", tone: "amber", label: "Maturity Profit" },
  WITHDRAWAL: { icon: "📤", tone: "rose", label: "Withdrawal" },
  MONTHLY: { icon: "🔁", tone: "violet", label: "Monthly Return" },
};

function UpcomingEventBox({ icon, tone, label, amount, title, dateLabel, loading, onClick }) {
  const t = KPI_TONES[tone] || KPI_TONES.blue;
  return (
    <div
      className={`card min-w-0 overflow-hidden border ${t.border} ${onClick ? "cursor-pointer transition hover:shadow-md active:scale-[0.99]" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${t.bar}`} />
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${t.bg}`}>{icon}</span>
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className="h-7 w-28 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
          </div>
        ) : (
          <>
            <p className={`text-lg font-extrabold leading-tight sm:text-xl ${t.value}`}>{amount}</p>
            {title && <p className="mt-1 truncate text-xs font-medium text-foreground">{title}</p>}
            {dateLabel && <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">{dateLabel}</p>}
          </>
        )}
      </div>
    </div>
  );
}

export function UpcomingDashboardBoxes({ data, loading, formatAmount, formatDate, onNavigate }) {
  const mat = data?.upcomingMaturity;
  const latest = data?.latestInvestment;
  const withdraw = data?.pendingWithdrawal;
  const monthly = data?.nextMonthlyReturn;

  const matDate = mat
    ? `${formatDate(mat.maturityDate)} · ${mat.daysLeft}d left`
    : "No upcoming maturity";
  const investDate = latest
    ? `Invested ${formatDate(latest.investedAt)}`
    : "No investments yet";
  const withdrawDate = withdraw
    ? `Requested ${formatDate(withdraw.requestedAt)} · ${withdraw.status}`
    : "No pending withdrawals";
  const monthlyDate = monthly
    ? `${formatDate(monthly.date)} · ${monthly.daysLeft}d left`
    : "No monthly returns due";

  return (
    <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 xl:grid-cols-4">
      <UpcomingEventBox
        icon="📅"
        tone="amber"
        label="Next Maturity Profit"
        amount={mat ? formatAmount(mat.profitAmount) : "—"}
        title={mat ? `${mat.planName} · ${formatAmount(mat.principal)} principal` : "Start investing to see maturities"}
        dateLabel={matDate}
        loading={loading}
        onClick={() => onNavigate?.("investments")}
      />
      <UpcomingEventBox
        icon="📈"
        tone="blue"
        label="Latest Investment"
        amount={latest ? formatAmount(latest.amount) : "—"}
        title={latest ? `${latest.planName} · ${latest.status}` : "Browse plans to invest"}
        dateLabel={investDate}
        loading={loading}
        onClick={() => onNavigate?.("investments")}
      />
      <UpcomingEventBox
        icon="📤"
        tone="rose"
        label="Pending Withdrawal"
        amount={withdraw ? formatAmount(withdraw.amount) : "—"}
        title={withdraw ? `${withdraw.mode} → ${withdraw.destination || "your account"}` : "Withdraw funds anytime"}
        dateLabel={withdrawDate}
        loading={loading}
        onClick={() => onNavigate?.("money", { moneyTab: "withdraw" })}
      />
      <UpcomingEventBox
        icon="🔁"
        tone="violet"
        label="Next Monthly Return"
        amount={monthly ? formatAmount(monthly.amount) : "—"}
        title={monthly?.plans?.length ? monthly.plans.join(", ") : "Based on active plans"}
        dateLabel={monthlyDate}
        loading={loading}
        onClick={() => onNavigate?.("money", { moneyTab: "overview" })}
      />
    </div>
  );
}

export function UpcomingScheduleList({ items, formatAmount, formatDate, loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No upcoming events scheduled.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const cfg = EVENT_KIND[item.kind] || EVENT_KIND.MATURITY;
        const t = KPI_TONES[cfg.tone] || KPI_TONES.blue;
        const dateText = item.daysLeft != null
          ? `${formatDate(item.date)} · ${item.daysLeft}d`
          : formatDate(item.date);
        return (
          <div key={item.id} className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${t.border} bg-card/50`}>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm ${t.bg}`}>{cfg.icon}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">{cfg.label} · {item.meta || "—"}</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-sm font-bold ${t.value}`}>{formatAmount(item.amount)}</p>
              <p className="text-[10px] font-medium text-muted-foreground">{dateText}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RecentActivityList({ items, formatAmount, formatDate }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((item) => (
        <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-3 py-3 first:pt-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase ${item.direction === "CREDIT" ? "text-emerald-600" : "text-rose-500"}`}>
                {item.type}
              </span>
              <span className="text-[10px] text-slate-400">{formatDate(item.createdAt)}</span>
            </div>
            <p className="truncate text-sm text-slate-500">{item.note || "—"}</p>
          </div>
          <div className={`shrink-0 text-sm font-bold ${item.direction === "CREDIT" ? "text-emerald-600" : "text-rose-500"}`}>
            {item.direction === "CREDIT" ? "+" : "−"}{formatAmount(item.amount)}
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No activity yet.</p>}
    </div>
  );
}
