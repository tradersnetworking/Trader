import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { INDIAN_LOCALES, getMessages, t as translate } from "./index.js";

const I18nContext = createContext({ locale: "en", setLocale: () => {}, t: (k) => k, rtl: false });

export function I18nProvider({ children, userLocale }) {
  const [locale, setLocaleState] = useState(() => userLocale || localStorage.getItem("aex-locale") || "en");
  const messages = useMemo(() => getMessages(locale), [locale]);
  const meta = INDIAN_LOCALES.find((l) => l.code === locale) || INDIAN_LOCALES[0];

  const setLocale = (code) => {
    setLocaleState(code);
    localStorage.setItem("aex-locale", code);
    document.documentElement.lang = code;
    document.documentElement.dir = meta.rtl ? "rtl" : "ltr";
  };

  useEffect(() => {
    if (userLocale && userLocale !== locale) setLocale(userLocale);
  }, [userLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = meta.rtl ? "rtl" : "ltr";
  }, [locale, meta.rtl]);

  const t = (key) => translate(messages, key);
  return (
    <I18nContext.Provider value={{ locale, setLocale, t, rtl: !!meta.rtl, locales: INDIAN_LOCALES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
