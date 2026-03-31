import {
  TTS2GoClient,
  AudioPlayer,
  hasSpeechSynthesis,
  speakFallback,
  acquireAudioLock,
  releaseAudioLock,
  generateInstanceId,
} from "@tts2go/core";
import type { TTSStatus, FallbackHandle } from "@tts2go/core";

function svgIcon(size: number, inner: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

function speakerSvg(size: number): string {
  return svgIcon(size,
    `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>` +
    `<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>` +
    `<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>`
  );
}

function loadingSvg(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">` +
    `<circle cx="12" cy="12" r="10" opacity="0.25"/>` +
    `<path d="M12 2a10 10 0 0 1 10 10" opacity="1">` +
    `<animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>` +
    `</path></svg>`;
}

function playingSvg(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" stroke="none">` +
    `<rect x="4" y="10" width="3" height="4" rx="1"><animate attributeName="height" values="4;14;4" dur="0.8s" repeatCount="indefinite"/><animate attributeName="y" values="10;5;10" dur="0.8s" repeatCount="indefinite"/></rect>` +
    `<rect x="10" y="8" width="3" height="8" rx="1"><animate attributeName="height" values="8;4;8" dur="0.8s" repeatCount="indefinite" begin="0.2s"/><animate attributeName="y" values="8;10;8" dur="0.8s" repeatCount="indefinite" begin="0.2s"/></rect>` +
    `<rect x="16" y="6" width="3" height="12" rx="1"><animate attributeName="height" values="12;6;12" dur="0.8s" repeatCount="indefinite" begin="0.4s"/><animate attributeName="y" values="6;9;6" dur="0.8s" repeatCount="indefinite" begin="0.4s"/></rect>` +
    `</svg>`;
}

function pauseSvg(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" stroke="none">` +
    `<rect x="6" y="4" width="4" height="16" rx="1"/>` +
    `<rect x="14" y="4" width="4" height="16" rx="1"/>` +
    `</svg>`;
}

function errorSvg(size: number): string {
  return svgIcon(size,
    `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>` +
    `<line x1="23" y1="9" x2="17" y2="15"/>` +
    `<line x1="17" y1="9" x2="23" y2="15"/>`
  );
}

function getIconHtml(status: TTSStatus, size: number): string {
  switch (status) {
    case "loading": return loadingSvg(size);
    case "playing":
    case "fallback": return playingSvg(size);
    case "paused": return pauseSvg(size);
    case "error": return errorSvg(size);
    default: return speakerSvg(size);
  }
}

function getAriaLabel(status: TTSStatus): string {
  switch (status) {
    case "loading": return "Loading audio...";
    case "playing":
    case "fallback": return "Stop audio";
    case "paused": return "Resume audio";
    case "error": return "Audio error, click to retry";
    default: return "Play audio";
  }
}

export function createTTSButton(
  client: TTS2GoClient,
  content: string,
  voiceId: string,
  size: number,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tts2go-btn";
  btn.setAttribute("data-tts2go-btn", "");

  let status: TTSStatus = "idle";
  let url: string | null = null;
  let player: AudioPlayer | null = null;
  let fallbackHandle: FallbackHandle | null = null;
  const instanceId = generateInstanceId();

  function setStatus(s: TTSStatus) {
    status = s;
    btn.innerHTML = getIconHtml(s, size);
    btn.setAttribute("aria-label", getAriaLabel(s));
    btn.title = getAriaLabel(s);
    btn.disabled = s === "loading";
  }

  function stop() {
    player?.stop();
    player = null;
    fallbackHandle?.cancel();
    fallbackHandle = null;
    releaseAudioLock(instanceId);
    setStatus("idle");
  }

  async function play() {
    player?.stop();
    player = null;
    fallbackHandle?.cancel();
    fallbackHandle = null;

    acquireAudioLock(instanceId, stop);
    setStatus("loading");

    const targetUrl = url || client.getCDNUrl(content, voiceId);

    let handled = false;
    function handleFailure() {
      if (handled) return;
      handled = true;
      player?.stop();
      player = null;
      url = null;

      setTimeout(() => {
        try { client.request(content, voiceId).catch(() => {}); } catch {}
      }, 0);

      if (hasSpeechSynthesis()) {
        setStatus("fallback");
        fallbackHandle = speakFallback(content, () => {
          releaseAudioLock(instanceId);
          setStatus("idle");
        });
      } else {
        releaseAudioLock(instanceId);
        setStatus("error");
      }
    }

    try {
      player = new AudioPlayer();
      player.onEnded = () => {
        url = targetUrl;
        releaseAudioLock(instanceId);
        setStatus("idle");
      };
      player.onError = handleFailure;
      setStatus("playing");
      await player.play(targetUrl);
    } catch {
      handleFailure();
    }
  }

  btn.addEventListener("click", () => {
    switch (status) {
      case "playing":
      case "fallback":
        stop();
        break;
      case "loading":
        break;
      default:
        play();
        break;
    }
  });

  setStatus("idle");
  return btn;
}
