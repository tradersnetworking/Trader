import { lazy } from "react";

export const MoneyHubPanel = lazy(() => import("../../components/invest/MoneyHubPanel.jsx"));
export const InvestmentDetailPanel = lazy(() => import("../../components/invest/InvestmentDetailPanel.jsx"));
export const LedgerTable = lazy(() => import("../../components/invest/LedgerTable.jsx"));
export const KycPanel = lazy(() => import("../../components/invest/KycPanel.jsx"));
export const TransactionsPanel = lazy(() => import("../../components/invest/TransactionsPanel.jsx"));
export const InvestorAgreementsPanel = lazy(() => import("../../components/invest/AgreementsPanel.jsx").then((m) => ({ default: m.InvestorAgreementsPanel })));
export const ReferralPanel = lazy(() => import("../../components/invest/ReferralPanel.jsx"));
export const SupportPanel = lazy(() => import("../../components/invest/SupportPanel.jsx"));
export const NotificationsPanel = lazy(() => import("../../components/invest/NotificationsPanel.jsx"));
export const SecuritySettingsPanel = lazy(() => import("../../components/invest/SecuritySettingsPanel.jsx").then((m) => ({ default: m.default })));
export const PushNotificationsToggle = lazy(() => import("../../components/invest/SecuritySettingsPanel.jsx").then((m) => ({ default: m.PushNotificationsToggle })));
