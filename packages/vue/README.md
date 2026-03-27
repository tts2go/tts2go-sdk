# @tts2go/vue

[![npm version](https://img.shields.io/npm/v/@tts2go/vue.svg)](https://www.npmjs.com/package/@tts2go/vue)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Vue 3 SDK for [TTS2Go](https://tts2go.com) — add AI text-to-speech to your Vue app in minutes. Drop-in `<TTSButton>` component or build custom UI with the `useTTS` composable.

## Installation

```bash
npm install @tts2go/vue
```

Requires Vue 3+.

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

### 1. Install the plugin

```typescript
// main.ts
import { createApp } from 'vue';
import { TTS2GoPlugin } from '@tts2go/vue';
import App from './App.vue';

const app = createApp(App);

app.use(TTS2GoPlugin, {
  apiKey: 'tts_your_api_key',
  projectId: 'your-project-id',
});

app.mount('#app');
```

### 2. Add TTS to any text

**Option A: Drop-in button**

```vue
<script setup>
import { TTSButton } from '@tts2go/vue';
</script>

<template>
  <p>{{ articleText }}</p>
  <TTSButton :content="articleText" voice-id="voice-id" />
</template>
```

**Option B: Custom UI with composable**

```vue
<script setup>
import { useTTS } from '@tts2go/vue';

const props = defineProps<{ text: string }>();
const { status, play, stop, pause } = useTTS(props.text, 'voice-id');
</script>

<template>
  <div>
    <template v-if="status.value === 'playing'">
      <button @click="pause">Pause</button>
      <button @click="stop">Stop</button>
    </template>
    <button v-else @click="play" :disabled="status.value === 'loading'">
      {{ status.value === 'loading' ? 'Loading...' : 'Play' }}
    </button>
    <span>Status: {{ status.value }}</span>
  </div>
</template>
```

## API Reference

### `TTS2GoPlugin`

Vue plugin that provides the TTS client globally via inject/provide.

```typescript
app.use(TTS2GoPlugin, {
  apiKey: string;       // Your API key
  projectId: string;    // Your project ID
  cdnBase?: string;     // Default: https://cdn.tts2go.com
  apiBase?: string;     // Default: https://backend.tts2go.com/api/v1
});
```

### `<TTSButton>`

Pre-styled button component with animated play/pause/loading icons.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `content` | `string` | Yes | — | Text to convert to speech |
| `voice-id` | `string` | Yes | — | Voice ID from your dashboard |
| `class` | `string` | No | — | Additional CSS classes |
| `size` | `number` | No | `24` | Icon size in pixels |

### `useTTS(content, voiceId)`

Composable for building custom TTS UI.

```typescript
const { status, url, error, play, stop, pause } = useTTS(content, voiceId);
```

| Return | Type | Description |
|--------|------|-------------|
| `status` | `ComputedRef<TTSStatus>` | Current playback state |
| `url` | `ComputedRef<string \| null>` | CDN URL once generated |
| `error` | `ComputedRef<string \| null>` | Error message |
| `play()` | `() => Promise<void>` | Start playback |
| `stop()` | `() => void` | Stop playback |
| `pause()` | `() => void` | Pause playback |

### `useTTS2GoContext()`

Access the TTS client and browser support flag directly.

```typescript
import { useTTS2GoContext } from '@tts2go/vue';

const { client, browserTTSSupported } = useTTS2GoContext();
const voices = await client.getVoices();
```

### Injection Key

For manual provide/inject patterns:

```typescript
import { TTS2GoKey } from '@tts2go/vue';
const ctx = inject(TTS2GoKey);
```

## Status Flow

```
idle → loading → playing → idle
                ↘ fallback → idle
                ↘ error
```

## TypeScript

Fully typed. Key types re-exported from `@tts2go/core`:

```typescript
import type { TTS2GoConfig, Voice, TTSStatus } from '@tts2go/vue';
```

## Documentation

Full documentation at **[tts2go.com/docs/vue](https://tts2go.com/docs/vue)**

## License

MIT
