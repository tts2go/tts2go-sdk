import { writable, derived, type Readable } from "svelte/store";
import {
  TTS2GoClient,
  AudioPlayer,
  hasSpeechSynthesis,
  speakFallback,
  acquireAudioLock,
  releaseAudioLock,
  generateInstanceId,
} from "@tts2go/core";
import type { TTS2GoConfig, TTSStatus, FallbackHandle } from "@tts2go/core";

export interface TTSStore {
  status: Readable<TTSStatus>;
  url: Readable<string | null>;
  error: Readable<string | null>;
  play: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  destroy: () => void;
}

export function createTTS(client: TTS2GoClient, content: string, voiceId: string): TTSStore {
  const status = writable<TTSStatus>("idle");
  const url = writable<string | null>(null);
  const error = writable<string | null>(null);
  let player: AudioPlayer | null = null;
  let fallbackHandle: FallbackHandle | null = null;
  let destroyed = false;
  const instanceId = generateInstanceId();

  function stop() {
    player?.stop();
    player = null;
    fallbackHandle?.cancel();
    fallbackHandle = null;
    releaseAudioLock(instanceId);
    status.set("idle");
  }

  async function play() {
    // Stop any existing playback
    player?.stop();
    player = null;
    fallbackHandle?.cancel();
    fallbackHandle = null;

    // Stop any other playing TTS instance
    acquireAudioLock(instanceId, stop);

    error.set(null);
    status.set("loading");

    let currentUrl: string | null = null;
    url.subscribe((v) => (currentUrl = v))();
    const targetUrl = currentUrl || client.getCDNUrl(content, voiceId);

    let handled = false;
    function handleFailure() {
      if (handled || destroyed) return;
      handled = true;
      player?.stop();
      player = null;
      url.set(null);

      setTimeout(() => {
        try { client.request(content, voiceId).catch(() => {}); } catch {}
      }, 0);

      if (hasSpeechSynthesis()) {
        status.set("fallback");
        fallbackHandle = speakFallback(content, () => {
          if (!destroyed) {
            releaseAudioLock(instanceId);
            status.set("idle");
          }
        });
      } else {
        releaseAudioLock(instanceId);
        status.set("error");
        error.set("TTS not available");
      }
    }

    try {
      player = new AudioPlayer();

      player.onEnded = () => {
        if (!destroyed) {
          url.set(targetUrl);
          releaseAudioLock(instanceId);
          status.set("idle");
        }
      };
      player.onError = handleFailure;

      status.set("playing");
      await player.play(targetUrl);
    } catch {
      handleFailure();
    }
  }

  function pause() {
    if (player?.isPlaying) {
      player.pause();
      status.set("paused");
    }
  }

  function destroy() {
    destroyed = true;
    stop();
  }

  return {
    status: derived(status, (s) => s),
    url: derived(url, (u) => u),
    error: derived(error, (e) => e),
    play,
    stop,
    pause,
    destroy,
  };
}

export function createTTS2GoClient(config: TTS2GoConfig): TTS2GoClient {
  return new TTS2GoClient(config);
}
