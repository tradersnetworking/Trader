import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MarketplaceLayout, InvestLayout } from "./components/Layouts.jsx";
import { useAuth } from "./lib/store.jsx";

// Marketplace pages
import Home from "./pages/main/Home.jsx";
import Products from "./pages/main/Products.jsx";
import ProductDetail from "./pages/main/ProductDetail.jsx";
import Sell from "./pages/main/Sell.jsx";
import UserDashboard from "./pages/main/UserDashboard.jsx";
import AdminDashboard from "./pages/main/AdminDashboard.jsx";

// Invest pages
import InvestHome from "./pages/invest/Home.jsx";
import InvestorDashboard from "./pages/invest/InvestorDashboard.jsx";
import InvestAdminDashboard from "./pages/invest/AdminDashboard.jsx";

// Shared auth
import { LoginScreen, RegisterScreen, ForgotScreen, ResetScreen } from "./components/AuthScreens.jsx";

function RequireAuth({ scope, roles, children }) {
  const auth = useAuth();
  const user = scope === "main" ? auth.main : auth.invest;
  const loading = scope === "main" ? auth.mainLoading : auth.investLoading;
  const loginPath = scope === "main" ? "/login" : "/invest/login";
  if (loading) return <div className="p-10 text-center text-slate-400">Loading…</div>;
  if (!user) return <Navigate to={loginPath} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={scope === "main" ? "/dashboard" : "/invest/dashboard"} replace />;
  return children;
}

const M = (el) => <MarketplaceLayout>{el}</MarketplaceLayout>;
const I = (el) => <InvestLayout>{el}</InvestLayout>;

export default function App() {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  return (
    <Routes>
      {/* ---------------- Marketplace (main domain) ---------------- */}
      <Route path="/" element={M(<Home />)} />
      <Route path="/products" element={M(<Products />)} />
      <Route path="/products/:slug" element={M(<ProductDetail />)} />
      <Route path="/sell" element={M(<Sell />)} />

      <Route path="/login" element={M(<LoginScreen scope="main" />)} />
      <Route path="/staff-login" element={M(<LoginScreen scope="main" staff />)} />
      <Route path="/register" element={M(<RegisterScreen scope="main" />)} />
      <Route path="/forgot-password" element={M(<ForgotScreen scope="main" />)} />
      <Route path="/reset-password" element={M(<ResetScreen scope="main" />)} />

      <Route path="/dashboard" element={<RequireAuth scope="main">{M(<UserDashboard />)}</RequireAuth>} />
      <Route path="/admin" element={<RequireAuth scope="main" roles={["ADMIN", "SUPERADMIN", "STAFF"]}>{M(<AdminDashboard />)}</RequireAuth>} />

      {/* ---------------- Invest (subdomain) ---------------- */}
      <Route path="/invest" element={I(<InvestHome />)} />
      <Route path="/invest/login" element={I(<LoginScreen scope="invest" />)} />
      <Route path="/invest/staff-login" element={I(<LoginScreen scope="invest" staff />)} />
      <Route path="/invest/register" element={I(<RegisterScreen scope="invest" />)} />
      <Route path="/invest/forgot-password" element={I(<ForgotScreen scope="invest" />)} />
      <Route path="/invest/reset-password" element={I(<ResetScreen scope="invest" />)} />

      <Route path="/invest/dashboard" element={<RequireAuth scope="invest">{I(<InvestorDashboard />)}</RequireAuth>} />
      <Route path="/invest/admin" element={<RequireAuth scope="invest" roles={["ADMIN", "SUPERADMIN"]}>{I(<InvestAdminDashboard />)}</RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
