import { writable, derived, type Readable } from "svelte/store";
import { TTS2GoClient, AudioPlayer, hasSpeechSynthesis, speakFallback, stopFallback } from "@tts2go/core";
import type { TTS2GoConfig, TTSStatus } from "@tts2go/core";

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
  let destroyed = false;

  function useBrowserFallback() {
    if (hasSpeechSynthesis()) {
      status.set("fallback");
      speakFallback(content);
      const estimatedDuration = Math.max(2000, content.length * 60);
      setTimeout(() => {
        if (!destroyed) status.set("idle");
      }, estimatedDuration);
    } else {
      status.set("error");
      error.set("TTS not available");
    }
  }

  async function play() {
    error.set(null);

    try {
      let currentUrl: string | null = null;
      url.subscribe((v) => (currentUrl = v))();

      if (currentUrl) {
        status.set("playing");
        player = new AudioPlayer();
        player.onEnded = () => {
          if (!destroyed) status.set("idle");
        };
        player.onError = () => {
          if (!destroyed) {
            status.set("error");
            error.set("Audio playback failed");
          }
        };
        await player.play(currentUrl);
        return;
      }

      // Try to play directly from CDN
      status.set("loading");
      const cdnUrl = client.getCDNUrl(content, voiceId);

      player = new AudioPlayer();
      player.onEnded = () => {
        if (!destroyed) status.set("idle");
      };
      player.onError = () => {
        if (destroyed) return;
        // Audio failed (likely 404) — fire request and use browser TTS
        client.request(content, voiceId).catch(() => {});
        useBrowserFallback();
      };

      try {
        status.set("playing");
        url.set(cdnUrl);
        await player.play(cdnUrl);
      } catch {
        if (destroyed) return;
        // Playback failed — fire request and use browser TTS
        client.request(content, voiceId).catch(() => {});
        useBrowserFallback();
      }
    } catch (err) {
      if (destroyed) return;
      status.set("error");
      error.set(err instanceof Error ? err.message : "Playback failed");
    }
  }

  function stop() {
    player?.stop();
    player = null;
    stopFallback();
    status.set("idle");
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
