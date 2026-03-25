# @tts2go/react

[![npm version](https://img.shields.io/npm/v/@tts2go/react.svg)](https://www.npmjs.com/package/@tts2go/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

React SDK for [TTS2Go](https://tts2go.com) — add AI text-to-speech to your React app in minutes. Drop-in `<TTSButton>` component or build custom UI with the `useTTS` hook.

## Installation

```bash
npm install @tts2go/react
```

Requires React 18+.

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

### 1. Wrap your app with the provider

```tsx
import { TTS2GoProvider } from '@tts2go/react';

function App() {
  return (
    <TTS2GoProvider config={{
      apiKey: 'tts_your_api_key',
      projectId: 'your-project-id',
    }}>
      <MyPage />
    </TTS2GoProvider>
  );
}
```

### 2. Add TTS to any text

**Option A: Drop-in button**

```tsx
import { TTSButton } from '@tts2go/react';

function Article({ text }: { text: string }) {
  return (
    <div>
      <p>{text}</p>
      <TTSButton content={text} voiceId="voice-id" />
    </div>
  );
}
```

**Option B: Custom UI with hook**

```tsx
import { useTTS } from '@tts2go/react';

function PlayButton({ text }: { text: string }) {
  const { status, play, stop, pause } = useTTS(text, 'voice-id');

  return (
    <div>
      {status === 'playing' ? (
        <>
          <button onClick={pause}>Pause</button>
          <button onClick={stop}>Stop</button>
        </>
      ) : (
        <button onClick={play} disabled={status === 'loading'}>
          {status === 'loading' ? 'Loading...' : 'Play'}
        </button>
      )}
      <span>Status: {status}</span>
    </div>
  );
}
```

## API Reference

### `<TTS2GoProvider>`

Wraps your app and provides the TTS client to all child components.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `config` | `TTS2GoConfig` | Yes | API key, project ID, and optional CDN/API base URLs |
| `children` | `ReactNode` | Yes | Child components |

### `<TTSButton>`

Pre-styled button with animated play/pause/loading icons.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `content` | `string` | Yes | — | Text to convert to speech |
| `voiceId` | `string` | Yes | — | Voice ID from your dashboard |
| `className` | `string` | No | — | Additional CSS classes |
| `size` | `number` | No | `24` | Icon size in pixels |

### `useTTS(content, voiceId)`

Hook for building custom TTS UI.

```typescript
const { status, url, error, play, stop, pause } = useTTS(content, voiceId);
```

| Return | Type | Description |
|--------|------|-------------|
| `status` | `TTSStatus` | `'idle'` \| `'loading'` \| `'playing'` \| `'paused'` \| `'error'` \| `'fallback'` |
| `url` | `string \| null` | CDN URL once audio is generated |
| `error` | `string \| null` | Error message if something failed |
| `play()` | `() => void` | Start playback (checks CDN, falls back to browser TTS, queues generation) |
| `stop()` | `() => void` | Stop playback |
| `pause()` | `() => void` | Pause playback |

### `useTTS2GoClient()`

Access the underlying `TTS2GoClient` instance for direct API calls.

```typescript
const client = useTTS2GoClient();
const voices = await client.getVoices();
```

## How It Works

1. User clicks play
2. SDK checks if audio exists on CDN (instant if cached)
3. If not cached, browser speech synthesis provides immediate playback
4. SDK queues the content for AI generation in the background
5. Next play of the same content loads from CDN — high quality, instant

## Status Flow

```
idle → loading → playing → idle
                ↘ fallback → idle
                ↘ error
```

## TypeScript

All exports are fully typed. Key types are re-exported from `@tts2go/core`:

```typescript
import type { TTS2GoConfig, Voice, TTSStatus } from '@tts2go/react';
```

## Documentation

Full documentation and quickstart at **[tts2go.com/docs/react](https://tts2go.com/docs/react)**

## License

MIT
