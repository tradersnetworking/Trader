import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { mainApi } from "../../lib/api.js";
import { useSiteMode } from "../../lib/site.js";

let cachedConfig = null;
let configPromise = null;

function loadConfig() {
  if (cachedConfig) return Promise.resolve(cachedConfig);
  if (!configPromise) {
    configPromise = mainApi("/public/site-config")
      .then((d) => {
        cachedConfig = d.config;
        return cachedConfig;
      })
      .catch(() => ({}));
  }
  return configPromise;
}

function upsertMeta(name, content, attr = "name") {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function injectScript(id, html) {
  if (!html || document.getElementById(id)) return;
  const el = document.createElement("script");
  el.id = id;
  el.innerHTML = html;
  document.head.appendChild(el);
}

function injectExternalScript(id, src, async = true) {
  if (!src || document.getElementById(id)) return;
  const el = document.createElement("script");
  el.id = id;
  el.src = src;
  el.async = async;
  document.head.appendChild(el);
}

export default function MainSiteMeta() {
  const mode = useSiteMode();
  const { pathname } = useLocation();
  const [cfg, setCfg] = useState(cachedConfig);

  useEffect(() => {
    if (mode !== "main") return;
    loadConfig().then(setCfg);
  }, [mode]);

  useEffect(() => {
    if (mode !== "main" || !cfg?.seo) return;

    const { seo, siteName, analytics, verification, robotsAllowIndex } = cfg;
    const pageTitle = pathname === "/" ? seo.title : `${document.title || seo.title}`;
    document.title = seo.title || pageTitle;

    upsertMeta("description", seo.description);
    upsertMeta("keywords", seo.keywords);
    upsertMeta("robots", robotsAllowIndex === false ? "noindex,nofollow" : "index,follow,max-image-preview:large");
    upsertLink("canonical", seo.canonicalUrl ? `${seo.canonicalUrl.replace(/\/$/, "")}${pathname === "/" ? "" : pathname}` : "");

    upsertMeta("og:title", seo.title, "property");
    upsertMeta("og:description", seo.description, "property");
    upsertMeta("og:type", "website", "property");
    upsertMeta("og:site_name", siteName || "Akshaya EXIM TRADERS", "property");
    if (seo.ogImage) upsertMeta("og:image", seo.ogImage.startsWith("http") ? seo.ogImage : `${window.location.origin}${seo.ogImage}`, "property");
    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", seo.title);
    upsertMeta("twitter:description", seo.description);

    if (verification?.google) upsertMeta("google-site-verification", verification.google);
    if (verification?.bing) upsertMeta("msvalidate.01", verification.bing);

    const gaId = analytics?.ga4MeasurementId;
    if (gaId && !document.getElementById("aex-ga4")) {
      injectExternalScript("aex-ga4-lib", `https://www.googletagmanager.com/gtag/js?id=${gaId}`);
      injectScript(
        "aex-ga4",
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`
      );
    }

    const gtmId = analytics?.gtmContainerId;
    if (gtmId && !document.getElementById("aex-gtm")) {
      injectScript(
        "aex-gtm",
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`
      );
    }

    const ldId = "aex-jsonld-org";
    let ld = document.getElementById(ldId);
    if (!ld) {
      ld = document.createElement("script");
      ld.id = ldId;
      ld.type = "application/ld+json";
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteName || "Akshaya EXIM TRADERS",
      url: seo.canonicalUrl || window.location.origin,
      logo: seo.ogImage?.startsWith("http") ? seo.ogImage : `${window.location.origin}${seo.ogImage || "/assets/logo.png"}`,
      description: cfg.seo?.jsonLdDescription || seo.description,
      sameAs: [],
    });
  }, [mode, cfg, pathname]);

  return null;
}

export { loadConfig as loadMainSiteConfig };
