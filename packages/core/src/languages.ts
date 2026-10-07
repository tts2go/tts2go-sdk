/**
 * Languages supported by TTS2Go: the overlap of every generation provider.
 *
 * This list must stay in sync with `packages/core/languages.json`, the
 * cross-repo contract that the backend vendors (a test asserts parity).
 */
export const SUPPORTED_LANGUAGES = [
  "en",
  "ar",
  "ar-SA",
  "ar-AE",
  "ar-EG",
  "zh",
  "fr",
  "de",
  "hi",
  "id",
  "it",
  "ja",
  "ko",
  "pt",
  "pt-BR",
  "pt-PT",
  "ru",
  "es",
  "es-MX",
  "es-ES",
  "tr",
] as const;

export type TTSLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export interface LanguageMeta {
  /** Base (primary) language subtag, e.g. `pt` for `pt-BR`. */
  base: string;
  /** English display name. */
  name: string;
  /** Display name in the language itself. */
  nativeName: string;
  /** BCP 47 tag to use for browser APIs such as `SpeechSynthesisUtterance.lang`. */
  bcp47: string;
  /** Text direction. */
  dir: "ltr" | "rtl";
}

export const LANGUAGE_META: Record<TTSLanguage, LanguageMeta> = {
  en: { base: "en", name: "English", nativeName: "English", bcp47: "en", dir: "ltr" },
  ar: { base: "ar", name: "Arabic", nativeName: "العربية", bcp47: "ar", dir: "rtl" },
  "ar-SA": { base: "ar", name: "Arabic (Saudi Arabia)", nativeName: "العربية (السعودية)", bcp47: "ar-SA", dir: "rtl" },
  "ar-AE": { base: "ar", name: "Arabic (UAE)", nativeName: "العربية (الإمارات)", bcp47: "ar-AE", dir: "rtl" },
  "ar-EG": { base: "ar", name: "Arabic (Egypt)", nativeName: "العربية (مصر)", bcp47: "ar-EG", dir: "rtl" },
  zh: { base: "zh", name: "Chinese (Simplified)", nativeName: "简体中文", bcp47: "zh-CN", dir: "ltr" },
  fr: { base: "fr", name: "French", nativeName: "Français", bcp47: "fr", dir: "ltr" },
  de: { base: "de", name: "German", nativeName: "Deutsch", bcp47: "de", dir: "ltr" },
  hi: { base: "hi", name: "Hindi", nativeName: "हिन्दी", bcp47: "hi", dir: "ltr" },
  id: { base: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", bcp47: "id", dir: "ltr" },
  it: { base: "it", name: "Italian", nativeName: "Italiano", bcp47: "it", dir: "ltr" },
  ja: { base: "ja", name: "Japanese", nativeName: "日本語", bcp47: "ja", dir: "ltr" },
  ko: { base: "ko", name: "Korean", nativeName: "한국어", bcp47: "ko", dir: "ltr" },
  pt: { base: "pt", name: "Portuguese", nativeName: "Português", bcp47: "pt", dir: "ltr" },
  "pt-BR": { base: "pt", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)", bcp47: "pt-BR", dir: "ltr" },
  "pt-PT": { base: "pt", name: "Portuguese (Portugal)", nativeName: "Português (Portugal)", bcp47: "pt-PT", dir: "ltr" },
  ru: { base: "ru", name: "Russian", nativeName: "Русский", bcp47: "ru", dir: "ltr" },
  es: { base: "es", name: "Spanish", nativeName: "Español", bcp47: "es", dir: "ltr" },
  "es-MX": { base: "es", name: "Spanish (Mexico)", nativeName: "Español (México)", bcp47: "es-MX", dir: "ltr" },
  "es-ES": { base: "es", name: "Spanish (Spain)", nativeName: "Español (España)", bcp47: "es-ES", dir: "ltr" },
  tr: { base: "tr", name: "Turkish", nativeName: "Türkçe", bcp47: "tr", dir: "ltr" },
};

const LOOKUP: Map<string, TTSLanguage> = new Map(
  SUPPORTED_LANGUAGES.map((code) => [code.toLowerCase(), code] as const)
);

/** True when `value` is exactly one of the canonical supported codes. */
export function isSupportedLanguage(value: unknown): value is TTSLanguage {
  return typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Resolve a user-supplied language tag to a supported code.
 *
 * Case-insensitive, accepts `_` as a separator, and falls back to the base
 * subtag when the full tag isn't supported (`en-US` → `en`,
 * `zh-Hant-TW` → `zh`). Returns `undefined` for anything unsupported.
 */
export function resolveLanguage(input?: string | null): TTSLanguage | undefined {
  if (typeof input !== "string") return undefined;
  const normalized = input.trim().replace(/_/g, "-").toLowerCase();
  if (!normalized) return undefined;

  const exact = LOOKUP.get(normalized);
  if (exact) return exact;

  const base = normalized.split("-")[0];
  return LOOKUP.get(base);
}
