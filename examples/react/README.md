# TTS2Go React Example

A minimal React app demonstrating the `@tts2go/react` SDK — including the pre-built `TTSButton` component and the `useTTS` hook for custom controls.

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
pnpm --filter @tts2go/react build

# Start the dev server
pnpm --filter example-react dev
```

Or from this directory:

```bash
cd examples/react
pnpm dev
```

The app will be available at `http://localhost:5173`.

## What's demonstrated

- **`TTS2GoProvider`** — wraps the app with SDK configuration
- **`TTSButton`** — drop-in speaker icon button with animated state icons
- **`useTTS` hook** — custom UI with play, pause, and stop controls plus a live status badge
