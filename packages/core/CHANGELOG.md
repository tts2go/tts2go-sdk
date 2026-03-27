# @tts2go/core

## 0.9.0

### Minor Changes

- update documentation and fix vanilla package

## 0.8.0

### Minor Changes

- updated documentation

## 0.7.0

### Minor Changes

- update error handling

## 0.6.0

### Minor Changes

- updated error handling and added tests

## 0.5.0

## 0.4.0

### Minor Changes

- upgrade

## 0.3.0

### Minor Changes

- update sdk

## 0.2.0

### Minor Changes

- 52c60d1: Remove mount-time HEAD requests across all framework packages. TTS audio is now fetched lazily on first play instead of eagerly checking the CDN on mount/creation. Vue and Vanilla packages also gain browser TTS support detection (`useTTS2GoContext` composable for Vue, `browserTTSSupported` getter for Vanilla) to allow hiding TTS buttons when no fallback is available.
- 933d4ed: update logic
- ceed128: this is a minor bump
