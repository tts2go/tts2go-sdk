# @tts2go/vue

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
