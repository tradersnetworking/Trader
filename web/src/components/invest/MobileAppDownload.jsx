import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";

export default function MobileAppDownload({ compact = false }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    investApi("/public/mobile-app")
      .then(setInfo)
      .catch(() => setInfo({ androidApkUrl: "/assets/apk/akshaya-invest.apk", appName: "AKASHYA INVESTMENTS", version: "1.0.0" }));
  }, []);

  if (!info) return null;

  const isAndroid = /android/i.test(navigator.userAgent);

  if (compact) {
    return (
      <a
        href={info.androidApkUrl}
        download
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-bold text-white shadow-md no-underline hover:opacity-90"
      >
        <span className="text-base">📱</span>
        Get App / PWA
      </a>
    );
  }

  return (
    <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-brand-blue text-xl text-white">📱</span>
          <div>
            <h3 className="font-bold text-navy dark:text-white">{info.appName}</h3>
            <p className="text-xs text-slate-500">v{info.version} · Native Android app</p>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Download the official app for investments, agreements, KYC, and maturity alerts on the go.
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <a
          href={info.androidApkUrl}
          download="akshaya-invest.apk"
          className="btn-gold inline-flex items-center justify-center gap-2 no-underline"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.523 2H6.477A2.477 2.477 0 004 4.477v15.046A2.477 2.477 0 006.477 22h11.046A2.477 2.477 0 0020 19.523V4.477A2.477 2.477 0 0017.523 2zM12 18.5a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm4.75-7.75H7.25v-5.5h9.5v5.5z" />
          </svg>
          Download APK
        </a>
        {isAndroid && info.pwaEnabled && (
          <p className="text-center text-[10px] text-slate-400">Or install from Chrome menu → Add to Home screen</p>
        )}
      </div>
    </div>
  );
}
