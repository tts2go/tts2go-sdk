# TTS2Go Svelte Example

A minimal Svelte 5 app demonstrating the `@tts2go/svelte` SDK — including the `createTTSButton` helper and `createTTS` store for custom controls.

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
pnpm --filter @tts2go/svelte build

# Start the dev server
pnpm --filter example-svelte dev
```

Or from this directory:

```bash
cd examples/svelte
pnpm dev
```

The app will be available at `http://localhost:5173`.

## What's demonstrated

- **`createTTS2GoClient`** — creates a TTS client instance
- **`createTTSButton`** — mounts a pre-built speaker button into a DOM target
- **`createTTS` store** — custom UI with play, pause, and stop controls plus a live status badge using Svelte store subscriptions
