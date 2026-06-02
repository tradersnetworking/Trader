import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { applySiteRootClass, getAppSiteMode } from "./lib/site.js";
import { loadPortalConfig } from "./lib/portalConfig.js";
import { configurePortalPwa } from "./lib/pwa.js";
import App from "./App.jsx";
import { AuthProvider } from "./lib/store.jsx";
import { ThemeProvider } from "./lib/theme.jsx";
import { I18nProvider } from "./lib/i18n/context.jsx";
import ScreenshotProtection from "./components/invest/ScreenshotProtection.jsx";

async function bootstrap() {
  await loadPortalConfig();
  const initialPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const initialMode = getAppSiteMode(initialPath);
  if (typeof document !== "undefined") {
    applySiteRootClass(initialMode);
    configurePortalPwa(initialMode);
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <I18nProvider>
              <ScreenshotProtection />
              <App />
            </I18nProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

bootstrap();
