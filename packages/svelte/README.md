# @tts2go/svelte

[![npm version](https://img.shields.io/npm/v/@tts2go/svelte.svg)](https://www.npmjs.com/package/@tts2go/svelte)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Svelte SDK for [TTS2Go](https://tts2go.com) — add AI text-to-speech to your Svelte app in minutes. Uses Svelte's reactive store pattern for idiomatic integration.

## Installation

```bash
npm install @tts2go/svelte
```

Requires Svelte 4+.

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

### 1. Create the client

```typescript
// lib/tts.ts
import { createTTS2GoClient } from '@tts2go/svelte';

export const ttsClient = createTTS2GoClient({
  apiKey: 'tts_your_api_key',
  projectId: 'your-project-id',
});
```

### 2. Add TTS to a component

**Option A: Reactive store**

```svelte
<script>
  import { createTTS } from '@tts2go/svelte';
  import { ttsClient } from '$lib/tts';
  import { onDestroy } from 'svelte';

  export let text;

  const tts = createTTS(ttsClient, text, 'voice-id');
  const { status, play, stop, pause, destroy } = tts;

  onDestroy(() => destroy());
</script>

{#if $status === 'playing'}
  <button on:click={pause}>Pause</button>
  <button on:click={stop}>Stop</button>
{:else}
  <button on:click={play} disabled={$status === 'loading'}>
    {$status === 'loading' ? 'Loading...' : 'Play'}
  </button>
{/if}

<span>Status: {$status}</span>
```

**Option B: Quick DOM button**

```svelte
<script>
  import { createTTSButton } from '@tts2go/svelte';
  import { ttsClient } from '$lib/tts';
  import { onDestroy } from 'svelte';

  export let text;
  let target;

  let button;
  $: if (target) {
    button = createTTSButton({
      client: ttsClient,
      content: text,
      voiceId: 'voice-id',
      target,
    });
  }

  onDestroy(() => button?.destroy());
</script>

<div bind:this={target}></div>
```

## API Reference

### `createTTS2GoClient(config)`

Factory for creating a `TTS2GoClient` instance.

```typescript
import { createTTS2GoClient } from '@tts2go/svelte';

const client = createTTS2GoClient({
  apiKey: string;       // Your API key
  projectId: string;    // Your project ID
  cdnBase?: string;     // Default: https://cdn.tts2go.dev
  apiBase?: string;     // Default: https://api.tts2go.dev/api/v1
});
```

### `createTTS(client, content, voiceId)`

Creates a reactive TTS store for a piece of content.

```typescript
const { status, url, error, play, stop, pause, destroy } = createTTS(client, content, voiceId);
```

| Return | Type | Description |
|--------|------|-------------|
| `status` | `Readable<TTSStatus>` | `'idle'` \| `'loading'` \| `'playing'` \| `'paused'` \| `'error'` \| `'fallback'` |
| `url` | `Readable<string \| null>` | CDN URL once audio is generated |
| `error` | `Readable<string \| null>` | Error message |
| `play()` | `() => Promise<void>` | Start playback |
| `stop()` | `() => void` | Stop playback |
| `pause()` | `() => void` | Pause playback |
| `destroy()` | `() => void` | Clean up resources |

All store values are Svelte `Readable` stores — use `$status` syntax in components.

### `createTTSButton(options)`

Mounts a pre-styled TTS button into a DOM target element.

```typescript
const button = createTTSButton({
  client: TTS2GoClient;    // Required
  content: string;         // Required - text to speak
  voiceId: string;         // Required - voice ID
  target: HTMLElement;     // Required - mount target
  className?: string;      // Optional CSS classes
  size?: number;           // Optional icon size (default: 24)
});

// Clean up when done
button.destroy();
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
import type { TTS2GoConfig, Voice, TTSStatus } from '@tts2go/svelte';
```

## Documentation

Full documentation at **[tts2go.com/docs/svelte](https://tts2go.com/docs/svelte)**

## License

MIT
