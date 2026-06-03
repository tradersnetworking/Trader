/** Admin quick links — shown above calendar on admin overview */
export default function AdminOverviewActionBar({ onNavigate }) {
  const items = [
    { label: "Today's Payments", tab: "pending-payments", tone: "amber" },
    { label: "Deposits", tab: "deposits", tone: "cyan" },
    { label: "Payouts", tab: "payouts", tone: "pink" },
    { label: "User KYC & Accounts", tab: "kyc", tone: "violet" },
  ];

  const toneClass = {
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-300",
    cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-800 hover:bg-cyan-500/20 dark:text-cyan-300",
    pink: "border-pink-500/40 bg-pink-500/10 text-pink-800 hover:bg-pink-500/20 dark:text-pink-300",
    violet: "border-violet-500/40 bg-violet-500/10 text-violet-800 hover:bg-violet-500/20 dark:text-violet-300",
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <button
          key={item.tab}
          type="button"
          onClick={() => onNavigate(item.tab)}
          className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${toneClass[item.tone]}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
