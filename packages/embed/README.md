# @tts2go/embed

[![npm version](https://img.shields.io/npm/v/@tts2go/embed.svg)](https://www.npmjs.com/package/@tts2go/embed)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Drop-in [TTS2Go](https://tts2go.com) script that automatically adds text-to-speech buttons to every piece of text on your page. No framework, no build step, no JavaScript required — just a single `<script>` tag.

## Installation

**CDN (recommended):**

```html
<script
  src="https://cdn.jsdelivr.net/npm/@tts2go/embed/dist/index.global.js"
  data-api-key="tts_your_api_key"
  data-project-id="your-project-id"
  data-voice-id="your-voice-id"
></script>
```

**npm:**

```bash
npm install @tts2go/embed
```

## Getting Started

Before adding the script, you need three things from the [TTS2Go dashboard](https://tts2go.com): an **API key**, a **project ID**, and a **voice ID**.

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

Add this single script tag to your HTML — that's it:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@tts2go/embed/dist/index.global.js"
  data-api-key="tts_your_api_key"
  data-project-id="your-project-id"
  data-voice-id="your-voice-id"
></script>
```

Every paragraph, heading, list item, and blockquote on your page will automatically get a small speaker button. Click it to hear the text read aloud.

## Configuration

Customize behavior with optional `data-*` attributes on the script tag:

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-api-key` | *required* | Your TTS2Go API key (starts with `tts_`) |
| `data-project-id` | *required* | Your project ID (UUID) |
| `data-voice-id` | *required* | The voice to use for all text |
| `data-selector` | `p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th, figcaption, dt, dd, caption, summary` | CSS selector for text elements to target |
| `data-min-length` | `15` | Minimum character count for text to get a button |
| `data-size` | `20` | Button icon size in pixels |

## How It Works

1. **Auto-discovery** — The script scans your page for text elements (paragraphs, headings, list items, etc.) and appends a small TTS button to each one.

2. **Nested text** — Inline elements like `<strong>`, `<em>`, `<a>`, and `<code>` are handled automatically. `<p>Hello <strong>world</strong>!</p>` is read as "Hello world!".

3. **Dynamic content** — A `MutationObserver` watches for new elements added to the page, so content loaded via JavaScript or SPAs gets buttons too.

4. **Smart playback** — Clicking a button tries to play from the CDN cache first. On a cache miss, it falls back to the browser's built-in speech synthesis while queuing server-side generation for next time.

5. **One at a time** — Only one TTS button can play at a time. Starting a new one automatically stops the previous.

## Skipping Content

The embed script skips elements inside `<nav>`, `<footer>`, `<header>`, `<script>`, `<style>`, and `<noscript>` by default.

To skip a specific section, add the `data-tts2go-ignore` attribute to its container:

```html
<div data-tts2go-ignore>
  <p>This text will not get a TTS button.</p>
</div>
```

## Full Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My Website</title>
</head>
<body>
  <h1>Welcome to My Website</h1>

  <p>This paragraph will get a TTS button automatically.</p>

  <p>
    So will this one, even with <strong>bold</strong> and
    <em>italic</em> text nested inside.
  </p>

  <ul>
    <li>Each list item gets its own button for individual playback.</li>
    <li>Users can listen to just the item they're interested in.</li>
  </ul>

  <blockquote>
    Blockquotes are included too — great for testimonials or pull quotes.
  </blockquote>

  <nav>
    <p>Navigation text is skipped by default.</p>
  </nav>

  <div data-tts2go-ignore>
    <p>This section is explicitly ignored.</p>
  </div>

  <script
    src="https://cdn.jsdelivr.net/npm/@tts2go/embed/dist/index.global.js"
    data-api-key="tts_your_api_key"
    data-project-id="your-project-id"
    data-voice-id="your-voice-id"
  ></script>
</body>
</html>
```

## Status Flow

```
idle → loading → playing → idle
                ↘ fallback → idle
                ↘ error
```

## Documentation

Full documentation at **[tts2go.com/docs/embed](https://tts2go.com/docs/embed)**

## License

MIT
