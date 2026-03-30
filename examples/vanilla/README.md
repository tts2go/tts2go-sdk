# TTS2Go Vanilla JS Example

A minimal plain JavaScript app demonstrating the `@tts2go/vanilla` SDK — no framework required, just the `TTS2Go` class and vanilla DOM manipulation.

## Prerequisites

- Node.js 18+
- pnpm

## Running the example

From the **SDK root** (`tts2go-sdk/`):

```bash
# Install all workspace dependencies
pnpm install

# Build the SDK packages (required for local workspace linking)
pnpm --filter @tts2go/core build
pnpm --filter @tts2go/vanilla build

# Start the dev server
pnpm --filter example-vanilla dev
```

Or from this directory:

```bash
cd examples/vanilla
pnpm dev
```

The app will be available at `http://localhost:5173`.

## What's demonstrated

- **`new TTS2Go(config)`** — client creation with API key and project ID
- **`tts.create(content, voiceId)`** — creating TTS instances for specific text
- **`onStatusChange` callback** — reacting to status updates (idle, loading, playing, paused, error, fallback)
- **Play, pause, and stop controls** — full playback control with live status badges
