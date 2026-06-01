import { getSetting, setSettings } from "./investSettings.js";

const KEY = "agreements_user_download_enabled";

export async function getAgreementSettings() {
  const raw = await getSetting(KEY);
  const userDownloadEnabled = raw !== "false";
  return {
    userDownloadEnabled,
    viewOnlyMode: !userDownloadEnabled,
  };
}

export async function updateAgreementSettings({ userDownloadEnabled, viewOnlyMode }) {
  let enabled = userDownloadEnabled;
  if (viewOnlyMode != null) enabled = !viewOnlyMode;
  await setSettings({ [KEY]: enabled ? "true" : "false" });
  return getAgreementSettings();
}
