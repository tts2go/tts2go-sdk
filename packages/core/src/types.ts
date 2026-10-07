import type { TTSLanguage } from "./languages";

/**
 * A language code. Any of the supported codes autocomplete, but any string is
 * accepted and resolved with `resolveLanguage()` (e.g. `"en-US"` → `"en"`).
 */
export type LanguageInput = TTSLanguage | (string & {});

export interface TTS2GoConfig {
  apiKey: string;
  projectId: string;
  cdnBase?: string;
  apiBase?: string;
  hideTTSIfNoFallback?: boolean;
  streamingWarmupMs?: number;
  /**
   * Default language for generation requests and browser fallback speech.
   * Omit to let the server use its default (English). Not part of the cache
   * key: identical text + voice returns the first generated audio regardless
   * of language.
   */
  language?: LanguageInput;
}

/** Per-call options for `request()` / `requestOrStream()` / `handleMiss()`. */
export interface TTSRequestOptions {
  /** Overrides the client's default `language` for this call. */
  language?: LanguageInput;
}

export interface Voice {
  id: string;
  name: string;
  description: string;
  preview_url: string;
}

export interface CheckResponse {
  exists: boolean;
  url?: string;
}

export interface RequestResponse {
  id?: string;
  status: string;
  message?: string;
}

export type TTSStatus = "idle" | "loading" | "playing" | "paused" | "error" | "fallback";
