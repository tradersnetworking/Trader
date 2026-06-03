# Android Native App (Capacitor)

The invest portal can be packaged as a native Android APK using [Capacitor](https://capacitorjs.com/).

## Prerequisites

- Node.js 18+
- [Android Studio](https://developer.android.com/studio) with Android SDK
- Java 17+

## One-time setup

```powershell
cd web
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
```

## Build release APK

```powershell
cd web
npm run build
npx cap sync android
npx cap open android
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

Copy the release APK to:

```
web/public/assets/apk/akshaya-invest.apk
```

The download button on the investor portal serves this file at `/assets/apk/akshaya-invest.apk`.

## Super Admin: custom APK URL

In **Admin → Settings**, set:

- `android_apk_url` — full URL or path to APK (e.g. `/assets/apk/akshaya-invest.apk`)
- `android_app_version` — display version (e.g. `1.0.0`)

## PWA fallback

Users can also install via Chrome **Add to Home screen** on **invest.akshayaexim.com** only (`manifest.invest.webmanifest`, icons from the AKSHAYA INVESTMENTS site logo). The main marketplace site does not offer a PWA install.
