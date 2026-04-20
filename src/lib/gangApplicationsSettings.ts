/** Стойност от site_settings.key = gang_applications_open */
export function areGangApplicationsOpen(settingValue: string | null | undefined): boolean {
  if (settingValue == null || String(settingValue).trim() === "") return true;
  const s = String(settingValue).trim().toLowerCase();
  return !["false", "0", "no", "off", "затворено", "затворени", "не"].includes(s);
}
