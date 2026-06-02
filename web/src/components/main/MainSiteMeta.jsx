import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { mainApi } from "../../lib/api.js";
import { useSiteMode } from "../../lib/site.js";
import { applyDocumentMeta, resolveMainPageMeta } from "../../lib/shareMeta.js";
import { MAIN_SUPPORT_EMAIL, MAIN_SUPPORT_PHONE_TEL } from "../../lib/mainContact.js";

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
  const [product, setProduct] = useState(null);

  const productSlug = pathname.match(/^\/products\/([^/]+)/)?.[1];

  useEffect(() => {
    if (mode !== "main") return;
    loadConfig().then(setCfg);
  }, [mode]);

  useEffect(() => {
    if (mode !== "main" || !productSlug) {
      setProduct(null);
      return;
    }
    mainApi(`/products/${productSlug}`)
      .then((d) => setProduct(d.product || null))
      .catch(() => setProduct(null));
  }, [mode, productSlug]);

  useEffect(() => {
    if (mode !== "main") return;

    const page = resolveMainPageMeta(pathname, cfg, product);
    const canonicalBase = cfg?.seo?.canonicalUrl?.replace(/\/$/, "") || window.location.origin;
    const pathSuffix = pathname === "/" ? "" : pathname;
    const pageUrl = `${canonicalBase}${pathSuffix}${window.location.search || ""}`;

    applyDocumentMeta({
      title: page.title,
      description: page.description,
      image: page.image,
      siteName: page.siteName,
      url: pageUrl,
      robots: cfg?.robotsAllowIndex === false ? "noindex,nofollow" : "index,follow,max-image-preview:large",
    });

    if (cfg?.verification?.google) {
      let el = document.querySelector('meta[name="google-site-verification"]');
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", "google-site-verification");
        document.head.appendChild(el);
      }
      el.setAttribute("content", cfg.verification.google);
    }
    if (cfg?.verification?.bing) {
      let el = document.querySelector('meta[name="msvalidate.01"]');
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", "msvalidate.01");
        document.head.appendChild(el);
      }
      el.setAttribute("content", cfg.verification.bing);
    }
    if (cfg?.seo?.keywords) {
      let el = document.querySelector('meta[name="keywords"]');
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", "keywords");
        document.head.appendChild(el);
      }
      el.setAttribute("content", cfg.seo.keywords);
    }

    const gaId = cfg?.analytics?.ga4MeasurementId;
    if (gaId && !document.getElementById("aex-ga4")) {
      injectExternalScript("aex-ga4-lib", `https://www.googletagmanager.com/gtag/js?id=${gaId}`);
      injectScript(
        "aex-ga4",
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`
      );
    }

    const gtmId = cfg?.analytics?.gtmContainerId;
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
    const orgName = page.siteName || "AKSHAYA EXIM TRADERS";
    const logo = page.image?.startsWith("http") ? page.image : `${canonicalBase}/assets/logo.png`;
    const graph = [
      {
        "@type": "Organization",
        "@id": `${canonicalBase}/#organization`,
        name: orgName,
        url: canonicalBase,
        logo,
        description: cfg?.seo?.jsonLdDescription || page.description,
        email: MAIN_SUPPORT_EMAIL,
        telephone: MAIN_SUPPORT_PHONE_TEL,
        areaServed: "Worldwide",
        sameAs: ["https://akshayaexim.in"],
      },
      {
        "@type": "WebSite",
        "@id": `${canonicalBase}/#website`,
        url: canonicalBase,
        name: orgName,
        publisher: { "@id": `${canonicalBase}/#organization` },
        inLanguage: "en-IN",
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${canonicalBase}/products?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ];
    if (pathname === "/faq") {
      graph.push({
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        url: pageUrl,
        isPartOf: { "@id": `${canonicalBase}/#website` },
      });
    }
    if (product?.name) {
      graph.push({
        "@type": "Product",
        name: product.name,
        description: product.description?.slice(0, 500) || page.description,
        url: pageUrl,
        brand: { "@type": "Brand", name: orgName },
      });
    }
    ld.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
  }, [mode, cfg, pathname, product]);

  return null;
}

export { loadConfig as loadMainSiteConfig };
