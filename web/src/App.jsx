import { useEffect, useState, lazy, Suspense } from "react";

import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

import { MarketplaceLayout, InvestLayout } from "./components/Layouts.jsx";

import { useAuth } from "./lib/store.jsx";
import { getToken } from "./lib/api.js";
import { configurePortalPwa, registerInvestServiceWorker, unregisterServiceWorker } from "./lib/pwa.js";

import {

  applySiteRootClass,

  getHostKind,

  investOrigin,

  investPath,

  investRouteBase,

  isInvestHost,

  isLocalDev,

  useSiteMode,
  getRouteSet,
  subscribeHostKind,

} from "./lib/site.js";



import PaymentReturnPage from "./pages/main/PaymentReturnPage.jsx";

const LazyMainHome = lazy(() => import("./pages/main/Home.jsx"));
const LazyProducts = lazy(() => import("./pages/main/Products.jsx"));
const LazyProductDetail = lazy(() => import("./pages/main/ProductDetail.jsx"));
const LazySell = lazy(() => import("./pages/main/Sell.jsx"));
const LazyUserDashboard = lazy(() => import("./pages/main/UserDashboard.jsx"));
const LazyMainAdminDashboard = lazy(() => import("./pages/main/AdminDashboard.jsx"));
const LazyCategoriesPage = lazy(() => import("./pages/main/CategoriesPage.jsx"));

import { AboutUs, PrivacyPolicy, ReturnsRefund, TermsOfService, ContactUs, FaqPage } from "./pages/main/StaticPages.jsx";



import InvestHome from "./pages/invest/Home.jsx";
import VerifyCertificatePage from "./pages/invest/VerifyCertificatePage.jsx";
import ReferralLandingPage from "./pages/invest/ReferralLandingPage.jsx";
import { InvestRiskDisclosure, InvestTermsOfService, InvestPrivacyPolicy, InvestAmlPolicy, InvestCookiePolicy } from "./pages/invest/InvestLegalPages.jsx";

import { LoginScreen, RegisterScreen, ForgotScreen, ResetScreen } from "./components/AuthScreens.jsx";
import StaffHandoffScreen from "./components/shared/StaffHandoffScreen.jsx";
import MainSiteMeta from "./components/main/MainSiteMeta.jsx";
import InvestSiteMeta from "./components/invest/InvestSiteMeta.jsx";

const LazyInvestorDashboard = lazy(() => import("./pages/invest/InvestorDashboard.jsx"));
const LazyInvestAdminDashboard = lazy(() => import("./pages/invest/AdminDashboard.jsx"));
const LazyOnboardingWizard = lazy(() => import("./pages/invest/OnboardingWizard.jsx"));
const LazyInvestRegisterWizard = lazy(() => import("./components/invest/InvestRegisterWizard.jsx"));

function PageLoader() {
  return <div className="flex min-h-[40vh] items-center justify-center p-10 text-muted-foreground">Loading…</div>;
}

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}



const M = (el) => <MarketplaceLayout>{el}</MarketplaceLayout>;

const I = (el) => <InvestLayout>{el}</InvestLayout>;



function RequireAuth({ scope, roles, children }) {

  const auth = useAuth();

  const user = scope === "main" ? auth.main : auth.invest;

  const loading = scope === "main" ? auth.mainLoading : auth.investLoading;

  const loginPath = scope === "main" ? "/login" : investPath("/login");

  const fallback = scope === "main" ? "/dashboard" : investPath("/dashboard");

  if (loading || (!user && getToken(scope))) {
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  }

  if (!user) return <Navigate to={loginPath} replace />;

  if (roles && !roles.includes(user.role)) return <Navigate to={fallback} replace />;

  return children;

}



function RedirectToInvestSubdomain() {

  const loc = useLocation();

  const tail = loc.pathname.replace(/^\/invest/, "") || "/";

  const qs = loc.search || "";

  const hash = loc.hash || "";

  window.location.replace(`${investOrigin()}${tail}${qs}${hash}`);

  return <div className="p-10 text-center text-muted-foreground">Redirecting to invest portal…</div>;

}



function HostNormalizer() {

  const loc = useLocation();

  const nav = useNavigate();



  useEffect(() => {

    if (isInvestHost() && (loc.pathname === "/invest" || loc.pathname.startsWith("/invest/"))) {

      const next = loc.pathname.replace(/^\/invest(?=\/|$)/, "") || "/";

      nav(`${next}${loc.search}${loc.hash}`, { replace: true });

    }

  }, [loc.pathname, loc.search, loc.hash, nav]);



  return null;

}



function SiteClassSync() {

  const mode = useSiteMode();

  useEffect(() => {

    applySiteRootClass(mode);

    configurePortalPwa(mode);
    if (mode === "invest") registerInvestServiceWorker(mode);
    else unregisterServiceWorker();

  }, [mode]);

  return null;

}



function MainRoutes() {

  const kind = getHostKind();

  return (

    <Routes>

      <Route path="/" element={M(<LazyPage><LazyMainHome /></LazyPage>)} />

      <Route path="/products" element={M(<LazyPage><LazyProducts /></LazyPage>)} />

      <Route path="/products/:slug" element={M(<LazyPage><LazyProductDetail /></LazyPage>)} />

      <Route path="/sell" element={M(<LazyPage><LazySell /></LazyPage>)} />

      <Route path="/categories" element={M(<LazyPage><LazyCategoriesPage /></LazyPage>)} />

      <Route path="/about" element={M(<AboutUs />)} />

      <Route path="/privacy" element={M(<PrivacyPolicy />)} />

      <Route path="/returns" element={M(<ReturnsRefund />)} />

      <Route path="/terms" element={M(<TermsOfService />)} />

      <Route path="/contact" element={M(<ContactUs />)} />

      <Route path="/faq" element={M(<FaqPage />)} />

      <Route path="/pay/return" element={<PaymentReturnPage />} />

      <Route path="/login" element={M(<LoginScreen scope="main" />)} />

      <Route path="/staff-login" element={M(<LoginScreen scope="main" staff />)} />

      <Route path="/staff-handoff" element={M(<StaffHandoffScreen scope="main" />)} />

      <Route path="/register" element={M(<RegisterScreen scope="main" />)} />

      <Route path="/forgot-password" element={M(<ForgotScreen scope="main" />)} />

      <Route path="/reset-password" element={M(<ResetScreen scope="main" />)} />



      <Route path="/dashboard" element={<RequireAuth scope="main"><LazyPage><LazyUserDashboard /></LazyPage></RequireAuth>} />

      <Route path="/admin" element={<RequireAuth scope="main" roles={["ADMIN", "SUPERADMIN", "STAFF"]}><LazyPage><LazyMainAdminDashboard /></LazyPage></RequireAuth>} />



      {isLocalDev() && (

        <>

          <Route path="/invest" element={I(<InvestHome />)} />

          <Route path="/invest/login" element={I(<LoginScreen scope="invest" />)} />

          <Route path="/invest/staff-login" element={I(<LoginScreen scope="invest" staff />)} />

          <Route path="/invest/staff-handoff" element={I(<StaffHandoffScreen scope="invest" />)} />

          <Route path="/invest/register" element={I(<LazyPage><LazyInvestRegisterWizard /></LazyPage>)} />

          <Route path="/invest/forgot-password" element={I(<ForgotScreen scope="invest" />)} />

          <Route path="/invest/reset-password" element={I(<ResetScreen scope="invest" />)} />
          <Route path="/invest/privacy" element={I(<InvestPrivacyPolicy />)} />
          <Route path="/invest/terms" element={I(<InvestTermsOfService />)} />
          <Route path="/invest/risk-disclosure" element={I(<InvestRiskDisclosure />)} />
          <Route path="/invest/aml-policy" element={I(<InvestAmlPolicy />)} />
          <Route path="/invest/cookie-policy" element={I(<InvestCookiePolicy />)} />
          <Route path="/invest/verify-certificate" element={I(<VerifyCertificatePage />)} />
          <Route path="/invest/ref/:code" element={I(<ReferralLandingPage />)} />
          <Route path="/invest/dashboard" element={<RequireAuth scope="invest"><LazyPage><LazyInvestorDashboard /></LazyPage></RequireAuth>} />

          <Route path="/invest/onboarding" element={<RequireAuth scope="invest">{I(<LazyPage><LazyOnboardingWizard /></LazyPage>)}</RequireAuth>} />

          <Route path="/invest/admin" element={<RequireAuth scope="invest" roles={["ADMIN", "SUPERADMIN"]}><LazyPage><LazyInvestAdminDashboard /></LazyPage></RequireAuth>} />

        </>

      )}



      {kind === "main-host" && (

        <Route path="/invest/*" element={<RedirectToInvestSubdomain />} />

      )}



      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>

  );

}



function InvestRoutes() {

  const base = investRouteBase();

  const p = (sub) => (base ? `${base}${sub}` : sub || "/");



  return (

    <Routes>

      <Route path={p("")} element={I(<InvestHome />)} />

      <Route path={p("/login")} element={I(<LoginScreen scope="invest" />)} />

      <Route path={p("/staff-login")} element={I(<LoginScreen scope="invest" staff />)} />

      <Route path={p("/staff-handoff")} element={I(<StaffHandoffScreen scope="invest" />)} />

      <Route path={p("/register")} element={I(<LazyPage><LazyInvestRegisterWizard /></LazyPage>)} />

      <Route path={p("/forgot-password")} element={I(<ForgotScreen scope="invest" />)} />

      <Route path={p("/reset-password")} element={I(<ResetScreen scope="invest" />)} />
      <Route path={p("/privacy")} element={I(<InvestPrivacyPolicy />)} />
      <Route path={p("/terms")} element={I(<InvestTermsOfService />)} />
      <Route path={p("/risk-disclosure")} element={I(<InvestRiskDisclosure />)} />
      <Route path={p("/aml-policy")} element={I(<InvestAmlPolicy />)} />
      <Route path={p("/cookie-policy")} element={I(<InvestCookiePolicy />)} />
      <Route path={p("/verify-certificate")} element={I(<VerifyCertificatePage />)} />
      <Route path={p("/ref/:code")} element={I(<ReferralLandingPage />)} />
      <Route path={p("/onboarding")} element={<RequireAuth scope="invest">{I(<LazyPage><LazyOnboardingWizard /></LazyPage>)}</RequireAuth>} />

      <Route path={p("/dashboard")} element={<RequireAuth scope="invest"><LazyPage><LazyInvestorDashboard /></LazyPage></RequireAuth>} />

      <Route path={p("/admin")} element={<RequireAuth scope="invest" roles={["ADMIN", "SUPERADMIN"]}><LazyPage><LazyInvestAdminDashboard /></LazyPage></RequireAuth>} />

      <Route path="*" element={<Navigate to={investPath("")} replace />} />

    </Routes>

  );

}



export default function App() {

  const loc = useLocation();

  const [, bumpHost] = useState(0);
  useEffect(() => subscribeHostKind(() => bumpHost((n) => n + 1)), []);

  const mode = useSiteMode();
  const routeSet = getRouteSet(mode);



  useEffect(() => {

    window.scrollTo(0, 0);

  }, [loc.pathname]);



  return (

    <>

      <MainSiteMeta />
      <InvestSiteMeta />

      <HostNormalizer />

      <SiteClassSync />

      {routeSet === "invest" ? <InvestRoutes /> : <MainRoutes />}

    </>

  );

}

