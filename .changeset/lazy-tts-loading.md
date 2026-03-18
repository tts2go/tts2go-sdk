---
"@tts2go/core": minor
"@tts2go/react": minor
"@tts2go/vue": minor
"@tts2go/svelte": minor
"@tts2go/vanilla": minor
---

Remove mount-time HEAD requests across all framework packages. TTS audio is now fetched lazily on first play instead of eagerly checking the CDN on mount/creation. Vue and Vanilla packages also gain browser TTS support detection (`useTTS2GoContext` composable for Vue, `browserTTSSupported` getter for Vanilla) to allow hiding TTS buttons when no fallback is available.
