import { useState, useEffect } from "react";
import { investFetchBlob } from "../../lib/api.js";
import { inr } from "../../lib/format.js";
import { INVEST_STAT_GRID } from "../../lib/invest-dashboard-ui.js";
import KpiStatCard from "./InvestDashboardWidgets.jsx";
import WalletQuickActions from "./WalletQuickActions.jsx";
import { DepositPanel, WithdrawPanel } from "./WalletFinancePanels.jsx";
import TransactionsPanel from "./TransactionsPanel.jsx";
import PendingInvestBanner from "./PendingInvestBanner.jsx";
import { pendingDepositAmount } from "../../lib/pendingInvest.js";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "deposit", label: "Deposit" },
  { id: "withdraw", label: "Withdraw" },
  { id: "history", label: "History" },
];

export default function MoneyHubPanel({
  wallet,
  onRefresh,
  initialSubTab = "overview",
  pendingInvest,
  onContinuePending,
  onDismissPending,
}) {
  const [sub, setSub] = useState(initialSubTab);

  useEffect(() => {
    setSub(initialSubTab);
  }, [initialSubTab]);

  const suggestedDeposit = pendingInvest ? pendingDepositAmount(pendingInvest, wallet?.available) : 0;

  const downloadStatementCsv = async () => {
    try {
      const blob = await investFetchBlob("/wallet/statement.csv");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wallet-statement-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };

  const downloadStatementPdf = async () => {
    try {
      const blob = await investFetchBlob("/wallet/statement.pdf");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wallet-statement-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="page-stack">
      {pendingInvest && (
        <PendingInvestBanner
          pending={pendingInvest}
          walletAvailable={wallet?.available}
          onContinue={onContinuePending}
          onDismiss={onDismissPending}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Money Hub</h2>
          <p className="text-sm text-muted-foreground">Deposit, withdraw, and track your wallet in one place.</p>
        </div>
        <WalletQuickActions compact layout="inline" onDeposit={() => setSub("deposit")} onWithdraw={() => setSub("withdraw")} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${sub === t.id ? "bg-primary/15 text-accent-tone" : "text-muted-foreground hover:bg-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "overview" && (
        <>
          <div className={INVEST_STAT_GRID}>
            <KpiStatCard tone="emerald" icon="👛" label="Available" value={inr(wallet?.available || 0)} />
            <KpiStatCard tone="blue" icon="💎" label="Invested" value={inr(wallet?.invested || 0)} />
            <KpiStatCard tone="violet" icon="✨" label="Earnings" value={inr(wallet?.earnings || 0)} />
            <KpiStatCard tone="amber" icon="💼" label="Total Balance" value={inr((wallet?.available || 0) + (wallet?.invested || 0) + (wallet?.earnings || 0))} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-gold text-sm" onClick={() => setSub("deposit")}>Add Funds</button>
            <button type="button" className="btn-outline text-sm" onClick={() => setSub("withdraw")}>Withdraw</button>
            <button type="button" className="btn-gold text-sm" onClick={downloadStatementPdf}>
              Download Statement (PDF)
            </button>
            <button type="button" className="btn-outline text-sm" onClick={downloadStatementCsv}>
              Download CSV
            </button>
          </div>
        </>
      )}

      {sub === "deposit" && (
        <DepositPanel
          onRefresh={onRefresh}
          suggestedAmount={suggestedDeposit > 0 ? suggestedDeposit : pendingInvest?.amount}
          pendingInvest={pendingInvest}
          walletAvailable={wallet?.available}
          onDepositSubmitted={onRefresh}
        />
      )}
      {sub === "withdraw" && <WithdrawPanel wallet={wallet} onRefresh={onRefresh} />}
      {sub === "history" && <TransactionsPanel />}
    </div>
  );
}
