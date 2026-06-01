import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { applySiteRootClass, getHostKind } from "./lib/site.js";
import App from "./App.jsx";
import { AuthProvider } from "./lib/store.jsx";
import { ThemeProvider } from "./lib/theme.jsx";
import { I18nProvider } from "./lib/i18n/context.jsx";
import ScreenshotProtection from "./components/invest/ScreenshotProtection.jsx";

const initialMode = typeof window !== "undefined" && getHostKind() === "invest-host" ? "invest" : "main";
if (typeof document !== "undefined") applySiteRootClass(initialMode);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
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
