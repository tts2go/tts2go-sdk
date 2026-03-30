# TTS2Go Vue Example

A minimal Vue 3 app demonstrating the `@tts2go/vue` SDK — including the pre-built `TTSButton` component and the `useTTS` composable for custom controls.

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
pnpm --filter @tts2go/vue build

# Start the dev server
pnpm --filter example-vue dev
```

Or from this directory:

```bash
cd examples/vue
pnpm dev
```

The app will be available at `http://localhost:5173`.

## What's demonstrated

- **`TTS2GoPlugin`** — Vue plugin installed at app level for global configuration
- **`TTSButton`** — drop-in speaker icon component with animated state icons
- **`useTTS` composable** — custom UI with play, pause, and stop controls plus a live status badge using Vue computed refs
