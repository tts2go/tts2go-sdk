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

  // Check CDN immediately
  client.check(content, voiceId).then((result) => {
    if (!destroyed && result.exists && result.url) {
      url.set(result.url);
    }
  }).catch(() => {
    // Silently fail CDN check
  });

  async function playAudioFromUrl(audioUrl: string) {
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

    await player.play(audioUrl);
  }

  async function play() {
    error.set(null);

    try {
      let currentUrl: string | null = null;
      url.subscribe((v) => (currentUrl = v))();

      if (currentUrl) {
        await playAudioFromUrl(currentUrl);
        return;
      }

      status.set("loading");
      try {
        const result = await client.requestAndPoll(content, voiceId);
        if (destroyed) return;

        url.set(result.url);
        await playAudioFromUrl(result.url);
      } catch (err) {
        if (destroyed) return;

        if (hasSpeechSynthesis()) {
          status.set("fallback");
          speakFallback(content);
          const estimatedDuration = Math.max(2000, content.length * 60);
          setTimeout(() => {
            if (!destroyed) status.set("idle");
          }, estimatedDuration);
        } else {
          status.set("error");
          error.set(err instanceof Error ? err.message : "TTS generation failed");
        }
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
