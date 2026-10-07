import { TTS2GoClient } from "@tts2go/core";
import { injectStyles } from "./styles";
import { scan, observe } from "./scanner";
import type { ScannerOptions } from "./scanner";

function init() {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) {
    console.error("[tts2go-embed] Could not find script element. Make sure the script is loaded via a <script> tag (not a module).");
    return;
  }

  const apiKey = script.dataset.apiKey;
  const projectId = script.dataset.projectId;
  const voiceId = script.dataset.voiceId;

  if (!apiKey || !projectId || !voiceId) {
    console.error("[tts2go-embed] Missing required data attributes: data-api-key, data-project-id, data-voice-id");
    return;
  }

  // data-language is the default; per-element data-tts-lang / lang attributes
  // (resolved at play time) override it.
  const language = script.dataset.language || undefined;
  const client = new TTS2GoClient({ apiKey, projectId, language });

  const opts: ScannerOptions = {
    client,
    voiceId,
    selector: script.dataset.selector || undefined,
    minLength: script.dataset.minLength ? parseInt(script.dataset.minLength, 10) : undefined,
    size: script.dataset.size ? parseInt(script.dataset.size, 10) : undefined,
  };

  injectStyles();

  function bootstrap() {
    scan(document, opts);
    observe(opts);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
}

init();
