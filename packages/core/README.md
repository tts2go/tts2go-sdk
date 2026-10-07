# @tts2go/core

[![npm version](https://img.shields.io/npm/v/@tts2go/core.svg)](https://www.npmjs.com/package/@tts2go/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Core client library for [TTS2Go](https://tts2go.com) — the fastest way to add AI text-to-speech to your website. Handles API communication, CDN URL generation, audio playback, and browser fallback.

> **Framework-specific packages**: If you're using React, Vue, Svelte, or vanilla JS, use the dedicated package instead — they wrap this core with idiomatic hooks and components:
> [`@tts2go/react`](https://www.npmjs.com/package/@tts2go/react) | [`@tts2go/vue`](https://www.npmjs.com/package/@tts2go/vue) | [`@tts2go/svelte`](https://www.npmjs.com/package/@tts2go/svelte) | [`@tts2go/vanilla`](https://www.npmjs.com/package/@tts2go/vanilla)

## Installation

```bash
npm install @tts2go/core
```

## Getting Started

Before writing any code, you need three things from the [TTS2Go dashboard](https://tts2go.com): an **API key**, a **project ID**, and a **voice ID**. Here's how to get them:

### 1. Create an account

Sign up for free at [tts2go.com](https://tts2go.com). No credit card required.

### 2. Create a project

![Create a project](https://raw.githubusercontent.com/tts2go/tts2go-sdk/main/images/create-a-project.png)

### 3. Copy your project ID

![Copy the project ID](https://raw.githubusercontent.com/tts2go/tts2go-sdk/main/images/copy-project-id.png)

### 4. Create an API key

![Create an API key](https://raw.githubusercontent.com/tts2go/tts2go-sdk/main/images/create-an-api-key.png)

### 5. Configure the API key

Set the domain you expect to receive TTS requests from and a rate limit to protect your credits.

![Configure the API key](https://raw.githubusercontent.com/tts2go/tts2go-sdk/main/images/configure-api-key.png)

### 6. Copy the API key

> **Important**: The full API key is only displayed once when you create it. Copy it now and store it securely.

![Copy the API key](https://raw.githubusercontent.com/tts2go/tts2go-sdk/main/images/copy-api-key.png)

### 7. Enable voices for your project

Browse the voice library, preview voices, and enable the ones you want to use.

![Enable voices](https://raw.githubusercontent.com/tts2go/tts2go-sdk/main/images/enable-voices.png)

### 8. Copy the voice ID

![Copy the voice ID](https://raw.githubusercontent.com/tts2go/tts2go-sdk/main/images/copy-voice-id.png)

You now have everything you need:
- **API key** — `tts_abc123...`
- **Project ID** — `dcb9dba4-6438-...`
- **Voice ID** — `a1b2c3d4-...`

---

## Quick Start

```typescript
import { TTS2GoClient, AudioPlayer } from '@tts2go/core';

const client = new TTS2GoClient({
  apiKey: 'tts_your_api_key',
  projectId: 'your-project-id',
});

// Check if audio already exists on CDN
const { exists, url } = await client.check('Hello world', 'voice-id');

if (exists) {
  const player = new AudioPlayer();
  await player.play(url!);
} else {
  // Request generation — audio will be cached on CDN for future requests
  await client.request('Hello world', 'voice-id');
}
```

## How TTS2Go Works

TTS2Go uses a **lazy caching** model:

1. Your site calls `check()` with text content and a voice ID
2. If the audio exists on CDN, you get a URL back instantly
3. If not, call `request()` to queue generation
4. AI scores the request against your content profile
5. Once approved, audio is generated via ElevenLabs and cached on CDN
6. Next time the same content is requested, it's served instantly from CDN

While audio is being generated, the SDK can use the browser's built-in speech synthesis as a fallback for instant playback.

## API Reference

### `TTS2GoClient`

```typescript
import { TTS2GoClient } from '@tts2go/core';

const client = new TTS2GoClient({
  apiKey: string;       // Your API key (starts with tts_)
  projectId: string;    // Your project ID (UUID)
  cdnBase?: string;     // Default: https://cdn.tts2go.com
  apiBase?: string;     // Default: https://backend.tts2go.com/api/v1
  language?: string;    // Default language, e.g. 'ja' or 'pt-BR' (see Languages)
});
```

| Method | Returns | Description |
|--------|---------|-------------|
| `check(content, voiceId)` | `Promise<CheckResponse>` | Check if audio exists on CDN |
| `request(content, voiceId, opts?)` | `Promise<RequestResponse>` | Queue content for TTS generation. `opts.language` overrides the config default |
| `requestOrStream(content, voiceId, opts?)` | `Promise<{ kind: 'queued' \| 'stream', … }>` | Like `request()`, but may return a streaming audio body |
| `getVoices()` | `Promise<Voice[]>` | List available voices |
| `getCDNUrl(content, voiceId)` | `string` | Generate deterministic CDN URL |

### Languages

Pass a language as a client default and/or per call. Supported codes:

`en`, `ar`, `ar-SA`, `ar-AE`, `ar-EG`, `zh`, `fr`, `de`, `hi`, `id`, `it`, `ja`, `ko`, `pt`, `pt-BR`, `pt-PT`, `ru`, `es`, `es-MX`, `es-ES`, `tr`

```typescript
import { TTS2GoClient, SUPPORTED_LANGUAGES, LANGUAGE_META, resolveLanguage } from '@tts2go/core';

const client = new TTS2GoClient({ apiKey, projectId, language: 'ja' });

await client.request('こんにちは', voiceId);                    // language: "ja"
await client.request('Olá', voiceId, { language: 'pt-BR' });    // per-call override wins

resolveLanguage('en-US');      // "en"     (falls back to the base language)
resolveLanguage('PT_br');      // "pt-BR"  (case-insensitive, `_` accepted)
resolveLanguage('zh-Hant-TW'); // "zh"
resolveLanguage('nl');         // undefined (unsupported)

LANGUAGE_META['ar-SA'];        // { base: 'ar', name, nativeName, bcp47: 'ar-SA', dir: 'rtl' }
```

- The effective language is the per-call `opts.language`, else `config.language`, resolved with `resolveLanguage()`.
- `language` is only added to the request body when it resolves. Without one, requests are identical to previous versions and the server uses its default (English).
- An unsupported value logs a one-time `console.warn` and the request is sent without a language.
- The browser speech fallback (`speakFallback`, `handleMiss`) sets `utterance.lang` and picks a matching installed voice when one exists.
- The list also ships as JSON: `import languages from '@tts2go/core/languages.json'`.

> **Note:** language is not part of the cache key. Identical text + voice returns the first generated audio regardless of language, so the first language to generate a given text wins.

### `AudioPlayer`

```typescript
import { AudioPlayer } from '@tts2go/core';

const player = new AudioPlayer();
await player.play('https://cdn.tts2go.com/...');
player.pause();
player.resume();
player.stop();
```

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `play(url)` | `Promise<void>` | Play audio from URL |
| `pause()` | `void` | Pause playback |
| `resume()` | `void` | Resume from pause |
| `stop()` | `void` | Stop and reset |
| `isPlaying` | `boolean` | Whether audio is playing |
| `isPaused` | `boolean` | Whether audio is paused |
| `duration` | `number` | Total duration in seconds |
| `currentTime` | `number` | Current playback position |
| `onEnded` | `() => void` | Callback when audio finishes |
| `onError` | `(e: Event) => void` | Callback on playback error |
| `onTimeUpdate` | `(current, duration) => void` | Progress callback |

### Browser Fallback

```typescript
import { hasSpeechSynthesis, speakFallback, stopFallback } from '@tts2go/core';

if (hasSpeechSynthesis()) {
  const handle = speakFallback('Hello world', onEnd, onError, 'en'); // language is optional
  // handle.cancel() to stop early
}
```

### CDN Utilities

```typescript
import { buildCDNUrl, contentHash } from '@tts2go/core';

const url = buildCDNUrl('https://cdn.tts2go.com', projectId, content, voiceId);
const hash = contentHash(content, projectId, voiceId);
// URL pattern: {cdnBase}/{projectId}/{voiceId}/{hash}.mp3
```

### Types

```typescript
interface TTS2GoConfig {
  apiKey: string;
  projectId: string;
  cdnBase?: string;
  apiBase?: string;
  hideTTSIfNoFallback?: boolean;
  language?: TTSLanguage | string;
}

interface TTSRequestOptions {
  language?: TTSLanguage | string;
}

type TTSLanguage = 'en' | 'ar' | 'ar-SA' | /* … */ 'tr'; // see SUPPORTED_LANGUAGES

interface Voice {
  id: string;
  name: string;
  description: string;
  preview_url: string;
}

interface CheckResponse {
  exists: boolean;
  url?: string;
}

interface RequestResponse {
  id?: string;
  status: string;
  message?: string;
}

type TTSStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'fallback';
```

## Status Flow

```
idle → loading → playing → idle
                ↘ fallback → idle
                ↘ error
```

## Documentation

Full documentation, quickstart guide, and dashboard at **[tts2go.com/docs](https://tts2go.com/docs)**

## License

MIT
