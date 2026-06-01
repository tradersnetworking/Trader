import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { mainApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { Stat } from "../../components/ui.jsx";
import MainDashboardShell from "../../components/main/MainDashboardShell.jsx";
import { MAIN_USER_NAV, mainNavLabel, MAIN_USER_MOBILE_PRIMARY } from "../../lib/main-nav.js";
import { DashboardTabFallback } from "../../components/invest/DashboardTabFallback.jsx";
import MainQuoteForm from "../../components/main/MainQuoteForm.jsx";
import MainProfilePanel from "../../components/main/MainProfilePanel.jsx";
import AccountSecurityPanel from "../../components/shared/AccountSecurityPanel.jsx";
import MainInvoicesPanel from "../../components/main/MainInvoicesPanel.jsx";
import MainPaymentPanel, { MainMyQuotesPanel, MainMyOrdersPanel } from "../../components/main/MainPaymentPanel.jsx";

const TAB_IDS = MAIN_USER_NAV.filter((n) => n.id).map((n) => n.id);

export default function UserDashboard() {
  const { main, logoutMain } = useAuth();
  const [sp, setSp] = useSearchParams();
  const tab = TAB_IDS.includes(sp.get("tab")) ? sp.get("tab") : "overview";
  const setTab = (id) => setSp({ tab: id });

  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [invoiceViewId, setInvoiceViewId] = useState(null);

  const load = useCallback(async () => {
    await Promise.all([
      mainApi("/quotes/mine").then((d) => setQuotes(d.quotes)).catch(() => {}),
      mainApi("/orders/mine").then((d) => setOrders(d.orders)).catch(() => {}),
      mainApi("/invoices/mine").then((d) => setInvoices(d.invoices)).catch(() => {}),
    ]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load();
      setRefreshKey((k) => k + 1);
    } finally {
      setRefreshing(false);
    }
  };

  const onInvoiceFromOrder = (inv) => {
    setInvoiceViewId(inv.id);
    setTab("invoices");
  };

  const renderTab = () => {
    switch (tab) {
      case "overview":
        return (
          <div className="page-stack">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="My Quotes" value={quotes.length} />
              <Stat label="My Orders" value={orders.length} accent="gold" />
              <Stat label="Invoices" value={invoices.length} accent="violet" />
              <Stat label="Account Type" value={main?.accountType} accent="cyan" />
            </div>
            <p className="text-sm text-muted-foreground">
              Welcome back, {main?.name}. Submit import RFQs, supply offers, track orders, and generate invoices from your dashboard.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { id: "rfq-buy", label: "Request Quote", desc: "Import / buy RFQ" },
                { id: "rfq-sell", label: "Supply Offer", desc: "Export / sell offer" },
                { id: "invoices", label: "New Invoice", desc: "Create proforma invoice" },
                { id: "profile", label: "Company Profile", desc: "GST & billing details" },
              ].map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setTab(a.id)}
                  className="card p-4 text-left transition hover:ring-2 hover:ring-primary/30"
                >
                  <div className="font-semibold text-foreground">{a.label}</div>
                  <div className="text-xs text-muted-foreground">{a.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );
      case "rfq-buy":
        return <MainQuoteForm user={main} direction="BUY" onSuccess={load} />;
      case "rfq-sell":
        return <MainQuoteForm user={main} direction="SELL" onSuccess={load} />;
      case "quotes":
        return <MainMyQuotesPanel key={refreshKey} />;
      case "orders":
        return <MainMyOrdersPanel onGenerateInvoice={onInvoiceFromOrder} key={refreshKey} />;
      case "invoices":
        return (
          <MainInvoicesPanel
            initialViewId={invoiceViewId}
            onViewed={() => setInvoiceViewId(null)}
            key={refreshKey}
          />
        );
      case "profile":
        return <MainProfilePanel />;
      case "account":
        return <AccountSecurityPanel portal="main" />;
      case "payment":
        return <MainPaymentPanel />;
      default:
        return (
          <DashboardTabFallback
            title="Section unavailable"
            message={`The "${tab}" panel is not available.`}
            onGoOverview={() => setTab("overview")}
          />
        );
    }
  };

  return (
    <MainDashboardShell
      user={main}
      mode="user"
      navItems={MAIN_USER_NAV}
      activeTab={tab}
      onTabChange={setTab}
      pageTitle={mainNavLabel(MAIN_USER_NAV, tab)}
      pageSubtitle={`${main?.name} • ${main?.accountType} account`}
      mobilePrimaryIds={MAIN_USER_MOBILE_PRIMARY}
      onLogout={logoutMain}
      onRefresh={handleRefresh}
      refreshing={refreshing}
    >
      {renderTab()}
    </MainDashboardShell>
  );
}
