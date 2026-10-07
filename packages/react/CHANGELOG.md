# @tts2go/react

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

## 0.10.0

### Minor Changes

- Updated examples and documentation

### Patch Changes

- Updated dependencies
  - @tts2go/core@0.10.0

## 0.9.0

### Minor Changes

- update documentation and fix vanilla package

### Patch Changes

- Updated dependencies
  - @tts2go/core@0.9.0

## 0.8.0

### Minor Changes

- updated documentation

### Patch Changes

- Updated dependencies
  - @tts2go/core@0.8.0

## 0.7.0

### Minor Changes

- update error handling

### Patch Changes

- Updated dependencies
  - @tts2go/core@0.7.0

## 0.6.0

### Minor Changes

- updated error handling and added tests

### Patch Changes

- Updated dependencies
  - @tts2go/core@0.6.0

## 0.5.0

### Minor Changes

- minor fix

### Patch Changes

- @tts2go/core@0.5.0

## 0.4.0

### Minor Changes

- upgrade

### Patch Changes

- Updated dependencies
  - @tts2go/core@0.4.0

## 0.3.0

### Minor Changes

- update sdk

### Patch Changes

- Updated dependencies
  - @tts2go/core@0.3.0

## 0.2.0

### Minor Changes

- 52c60d1: Remove mount-time HEAD requests across all framework packages. TTS audio is now fetched lazily on first play instead of eagerly checking the CDN on mount/creation. Vue and Vanilla packages also gain browser TTS support detection (`useTTS2GoContext` composable for Vue, `browserTTSSupported` getter for Vanilla) to allow hiding TTS buttons when no fallback is available.
- 933d4ed: update logic
- ceed128: this is a minor bump

### Patch Changes

- Updated dependencies [52c60d1]
- Updated dependencies [933d4ed]
- Updated dependencies [ceed128]
  - @tts2go/core@0.2.0
