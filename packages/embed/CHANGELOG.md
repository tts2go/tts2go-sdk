# @tts2go/embed

## 1.1.0

### Minor Changes

- Add multi-language support.

  - `@tts2go/core`: new `language` config option and per-call `{ language }` option on `request()`, `requestOrStream()` and `handleMiss()`. The value is resolved with the new `resolveLanguage()` (case-insensitive, accepts `_`, falls back to the base language, e.g. `en-US` → `en`) and sent as `language` in the `/sdk/request` body only when set. Unsupported values log a one-time warning and are omitted. Exports `SUPPORTED_LANGUAGES`, `TTSLanguage`, `LANGUAGE_META`, `resolveLanguage` and `isSupportedLanguage`, and ships the list as `@tts2go/core/languages.json`. The browser speech fallback now sets `utterance.lang` (and picks a matching installed voice when available).
  - `@tts2go/react`: `useTTS(content, voiceId, { language })` and a `language` prop on `TTSButton`.
  - `@tts2go/vue`: `useTTS(content, voiceId, { language })` and a `language` prop on `TTSButton`.
  - `@tts2go/svelte`: `createTTS(client, content, voiceId, { language })` and a `language` option on `createTTSButton`.
  - `@tts2go/vanilla`: `create(content, voiceId, { language })` / `generate(content, voiceId, { language })`.
  - `@tts2go/embed`: reads the language per element from the closest `data-tts-lang`, else the closest `lang` attribute, else `<html lang>`; a `data-language` attribute on the script tag sets the default.

  Language is not part of the cache key: identical text + voice returns the first generated audio regardless of language.

### Patch Changes

- Updated dependencies
  - @tts2go/core@1.1.0

## 1.0.0

### Major Changes

- adds streaming capability for projects that are configured with it

### Patch Changes

- Updated dependencies
  - @tts2go/core@1.0.0

## 0.12.0

### Minor Changes

- added readme

## 0.11.0

### Minor Changes

- added embed package
