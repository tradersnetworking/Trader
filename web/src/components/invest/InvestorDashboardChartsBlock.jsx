import { inr } from "../../lib/format.js";

const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899"];

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

function AreaChartSvg({ data, height = 220 }) {
  if (!data?.length) return null;
  const w = 400;
  const h = height;
  const pad = { t: 8, r: 8, b: 24, l: 8 };
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = 0;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const pts = data.map((d, i) => {
    const x = pad.l + (i / Math.max(data.length - 1, 1)) * innerW;
    const y = pad.t + innerH - ((d.value - min) / (max - min || 1)) * innerH;
    return { x, y, ...d };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${(pad.t + innerH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(pad.t + innerH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[220px] w-full sm:h-[260px]" preserveAspectRatio="none">
      <defs>
        <linearGradient id="portfolioAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#F59E0B" stopOpacity="0.35" />
          <stop offset="95%" stopColor="#F59E0B" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={pad.l} x2={w - pad.r} y1={pad.t + innerH * f} y2={pad.t + innerH * f} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
      ))}
      <path d={area} fill="url(#portfolioAreaGrad)" />
      <path d={line} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.filter((_, i) => i === 0 || i === pts.length - 1 || i % Math.ceil(pts.length / 4) === 0).map((p) => (
        <text key={p.date} x={p.x} y={h - 4} textAnchor="middle" className="fill-muted-foreground text-[9px]">{p.date}</text>
      ))}
    </svg>
  );
}

function PieChartSvg({ items }) {
  const total = items.reduce((n, i) => n + (i.value || 0), 0) || 1;
  let angle = -Math.PI / 2;
  const cx = 90;
  const cy = 90;
  const r = 70;
  const ir = 46;

  const slices = items.map((item, i) => {
    const frac = item.value / total;
    const sweep = frac * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const ix1 = cx + ir * Math.cos(angle - sweep);
    const iy1 = cy + ir * Math.sin(angle - sweep);
    const ix2 = cx + ir * Math.cos(angle);
    const iy2 = cy + ir * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const color = PIE_COLORS[i % PIE_COLORS.length];
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1} Z`;
    return { d, color, item, pct: ((item.value / total) * 100).toFixed(1) };
  });

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <svg viewBox="0 0 180 180" className="h-40 w-40 shrink-0">
        {slices.map((s) => <path key={s.item.name} d={s.d} fill={s.color} />)}
      </svg>
      <div className="w-full min-w-0 space-y-2">
        {slices.map((s) => (
          <div key={s.item.name} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="truncate text-muted-foreground">{s.item.name}</span>
            </div>
            <div className="shrink-0 text-right">
              <span className="font-semibold">{inr(s.item.value)}</span>
              <span className="ml-1 text-muted-foreground">({s.pct}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChartSvg({ data, height = 200 }) {
  if (!data?.length) return null;
  const w = 400;
  const h = height;
  const pad = { t: 8, r: 8, b: 28, l: 8 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(...data.map((d) => d.return || 0), 1);
  const barW = innerW / data.length * 0.65;
  const gap = innerW / data.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[200px] w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh = (d.return / max) * innerH;
        const x = pad.l + i * gap + (gap - barW) / 2;
        const y = pad.t + innerH - bh;
        const fill = d.return >= 6 ? "#22c55e" : "#F59E0B";
        return (
          <g key={d.month}>
            <rect x={x} y={y} width={barW} height={Math.max(bh, 2)} rx="4" fill={fill} fillOpacity="0.9" />
            <text x={x + barW / 2} y={h - 6} textAnchor="middle" className="fill-muted-foreground text-[9px]">{d.month}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function InvestorDashboardChartsBlock({
  chartData = [],
  portfolioPie = [],
  monthlyReturns = [],
  loading = false,
  hasPortfolioData = false,
  onViewPlans,
}) {
  const hasMonthly = monthlyReturns.some((d) => d.return > 0 || d.amount > 0);

  return (
    <>
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="card overflow-hidden border-border/80 bg-muted/40 dark:bg-white/5 lg:col-span-2">
          <div className="border-b border-border/60 p-4 sm:p-5">
            <div className="flex flex-col gap-2 xs:flex-row xs:items-center xs:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold">
                  <span className="text-amber-600">📈</span> Portfolio Performance
                </h3>
                <p className="text-xs text-muted-foreground">Wallet balance trend from ledger activity</p>
              </div>
              <span className="w-fit rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400">Live</span>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            {loading ? (
              <Skeleton className="h-[220px] w-full sm:h-[260px]" />
            ) : chartData.length > 0 ? (
              <AreaChartSvg data={chartData} />
            ) : (
              <div className="flex h-[220px] flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground sm:h-[260px]">
                <span className="text-4xl opacity-20">📊</span>
                <p className="text-sm">Make your first investment to see portfolio performance.</p>
                {onViewPlans && (
                  <button type="button" className="btn-gold px-4 py-2 text-sm" onClick={onViewPlans}>View Plans</button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="card overflow-hidden border-border/80 bg-muted/40 dark:bg-white/5">
          <div className="border-b border-border/60 p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-base font-bold">
              <span className="text-amber-600">🥧</span> Asset Allocation
            </h3>
            <p className="text-xs text-muted-foreground">Available · Invested · Earnings</p>
          </div>
          <div className="p-4 sm:p-5">
            {loading ? (
              <Skeleton className="mx-auto h-36 w-36 rounded-full" />
            ) : hasPortfolioData && portfolioPie.length ? (
              <PieChartSvg items={portfolioPie} />
            ) : (
              <div className="flex h-[200px] flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
                <span className="text-3xl opacity-20">🥧</span>
                <p className="text-xs">Add funds and invest to see allocation.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden border-border/80 bg-muted/40 dark:bg-white/5">
        <div className="border-b border-border/60 p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <span className="text-amber-600">📊</span> Monthly Returns
          </h3>
          <p className="text-xs text-muted-foreground">Return % relative to active invested capital (INR)</p>
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : hasMonthly ? (
            <>
              <BarChartSvg data={monthlyReturns} />
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                Latest month profit: {inr(monthlyReturns[monthlyReturns.length - 1]?.amount || 0)} · {inr(monthlyReturns[monthlyReturns.length - 1]?.invested || 0)} invested base
              </p>
            </>
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
              <span className="text-3xl opacity-20">📊</span>
              <p className="text-xs">Returns will appear after your first profit credit.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
