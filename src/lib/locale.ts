export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi',   nativeLabel: 'हिन्दी',  flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी',   flag: '🇮🇳' },
] as const;

export type LocaleCode = 'en' | 'hi' | 'mr';

export function getLocale(): LocaleCode {
  if (typeof window === 'undefined') return 'en';
  const match = document.cookie.match(/(^|;)\s*NEXT_LOCALE\s*=\s*([^;]+)/);
  const val = match ? match[2] : 'en';
  return (val === 'hi' || val === 'mr') ? val : 'en';
}

export function setLocale(code: LocaleCode) {
  if (typeof window === 'undefined') return;
  // Set cookie for 1 year
  document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`;
  window.location.reload();
}
