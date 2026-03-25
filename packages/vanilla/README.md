# @tts2go/vanilla

[![npm version](https://img.shields.io/npm/v/@tts2go/vanilla.svg)](https://www.npmjs.com/package/@tts2go/vanilla)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Vanilla JavaScript SDK for [TTS2Go](https://tts2go.com) — add AI text-to-speech to any website with zero framework dependencies. Works with npm or a CDN script tag.

## Installation

**npm:**

```bash
npm install @tts2go/vanilla
```

**CDN (script tag):**

```html
<script src="https://unpkg.com/@tts2go/vanilla/dist/index.global.js"></script>
```

When loaded via script tag, the SDK is available as `window.TTS2Go`.

## Getting Started

Before writing any code, you need three things from the [TTS2Go dashboard](https://tts2go.com): an **API key**, a **project ID**, and a **voice ID**.

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

### npm / ES Modules

```javascript
import { TTS2Go } from '@tts2go/vanilla';

const tts = new TTS2Go({
  apiKey: 'tts_your_api_key',
  projectId: 'your-project-id',
});

// Create an instance for a piece of text
const instance = tts.create('Hello world', 'voice-id');
await instance.play();
```

### Script Tag

```html
<script src="https://unpkg.com/@tts2go/vanilla/dist/index.global.js"></script>
<script>
  const tts = new TTS2Go({
    apiKey: 'tts_your_api_key',
    projectId: 'your-project-id',
  });

  document.getElementById('play-btn').addEventListener('click', async () => {
    const instance = tts.create('Hello world', 'voice-id');
    await instance.play();
  });
</script>
```

### One-Shot Generation

```javascript
// Create and play immediately in one call
const instance = await tts.generate('Hello world', 'voice-id');
// Audio is already playing
```

## API Reference

### `TTS2Go`

```javascript
const tts = new TTS2Go({
  apiKey: string;       // Your API key (starts with tts_)
  projectId: string;    // Your project ID (UUID)
  cdnBase?: string;     // Default: https://cdn.tts2go.dev
  apiBase?: string;     // Default: https://api.tts2go.dev/api/v1
});
```

| Method | Returns | Description |
|--------|---------|-------------|
| `create(content, voiceId)` | `TTSInstance` | Create a TTS instance (does not auto-play) |
| `generate(content, voiceId)` | `Promise<TTSInstance>` | Create and play immediately |
| `getVoices()` | `Promise<Voice[]>` | List available voices |
| `browserTTSSupported` | `boolean` | Whether browser speech synthesis is available |

### `TTSInstance`

Returned by `create()` and `generate()`. Controls playback for a single piece of content.

| Method / Property | Type | Description |
|-------------------|------|-------------|
| `play()` | `Promise<void>` | Start playback (CDN check, fallback, generation) |
| `stop()` | `void` | Stop playback |
| `pause()` | `void` | Pause playback |
| `resume()` | `void` | Resume from pause |
| `getStatus()` | `TTSStatus` | Current status synchronously |
| `getUrl()` | `string \| null` | CDN URL once generated |
| `getError()` | `string \| null` | Error message if failed |
| `destroy()` | `void` | Clean up resources |
| `on(event, callback)` | `void` | Subscribe to events |
| `off(event, callback)` | `void` | Unsubscribe from events |

### Events

```javascript
const instance = tts.create('Hello world', 'voice-id');

instance.on('statusChange', (status) => {
  console.log('Status:', status);
  // 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'fallback'
});

instance.on('urlReady', (url) => {
  console.log('CDN URL:', url);
});

instance.on('error', (message) => {
  console.error('Error:', message);
});

instance.on('timeUpdate', ({ currentTime, duration }) => {
  const progress = (currentTime / duration) * 100;
  console.log(`${progress.toFixed(0)}%`);
});

instance.on('play', () => console.log('Started'));
instance.on('pause', () => console.log('Paused'));
instance.on('stop', () => console.log('Stopped'));
```

## Full Example

```html
<button id="play">Play</button>
<button id="stop" disabled>Stop</button>
<span id="status">idle</span>

<script src="https://unpkg.com/@tts2go/vanilla/dist/index.global.js"></script>
<script>
  const tts = new TTS2Go({
    apiKey: 'tts_your_api_key',
    projectId: 'your-project-id',
  });

  const playBtn = document.getElementById('play');
  const stopBtn = document.getElementById('stop');
  const statusEl = document.getElementById('status');

  const instance = tts.create(
    'Welcome to our website. This text is being read aloud by TTS2Go.',
    'voice-id'
  );

  instance.on('statusChange', (status) => {
    statusEl.textContent = status;
    stopBtn.disabled = status !== 'playing';
    playBtn.disabled = status === 'loading';
    playBtn.textContent = status === 'loading' ? 'Loading...' : 'Play';
  });

  playBtn.addEventListener('click', () => instance.play());
  stopBtn.addEventListener('click', () => instance.stop());
</script>
```

## Status Flow

```
idle → loading → playing → idle
                ↘ fallback → idle
                ↘ error
```

## TypeScript

Fully typed when installed via npm:

```typescript
import type { TTS2GoConfig, Voice, TTSStatus, TTSInstance } from '@tts2go/vanilla';
```

## Documentation

Full documentation at **[tts2go.com/docs/vanilla](https://tts2go.com/docs/vanilla)**

## License

MIT
