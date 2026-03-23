import { writable, derived, type Readable } from "svelte/store";
import {
  TTS2GoClient,
  AudioPlayer,
  hasSpeechSynthesis,
  speakFallback,
  stopFallback,
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
    error.set(null);

    // Stop any existing playback from this instance
    player?.stop();
    player = null;
    fallbackHandle?.cancel();
    fallbackHandle = null;

    // Stop any other playing TTS instance
    acquireAudioLock(instanceId, stop);

    try {
      let currentUrl: string | null = null;
      url.subscribe((v) => (currentUrl = v))();

      const targetUrl = currentUrl || client.getCDNUrl(content, voiceId);
      const isFirstAttempt = !currentUrl;

      if (!isFirstAttempt) {
        // We have a confirmed-working URL — play with error handling
        status.set("playing");
        player = new AudioPlayer();

        player.onEnded = () => {
          if (!destroyed) {
            releaseAudioLock(instanceId);
            status.set("idle");
          }
        };
        player.onError = () => {
          if (!destroyed) {
            releaseAudioLock(instanceId);
            status.set("error");
            error.set("Audio playback failed");
          }
        };

        await player.play(targetUrl);
        return;
      }

      // First attempt — try CDN, fallback to browser TTS on failure
      status.set("loading");

      player = new AudioPlayer();

      let handled = false;
      function handleCdnFailure() {
        if (handled || destroyed) return;
        handled = true;
        player?.stop();
        player = null;

        try { client.request(content, voiceId).catch(() => {}); } catch {}

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

      player.onEnded = () => {
        if (!destroyed) {
          releaseAudioLock(instanceId);
          status.set("idle");
        }
      };
      player.onError = handleCdnFailure;

      try {
        status.set("playing");
        await player.play(targetUrl);
        if (!destroyed) url.set(targetUrl);
      } catch {
        handleCdnFailure();
      }
    } catch (err) {
      if (destroyed) return;
      releaseAudioLock(instanceId);
      status.set("error");
      error.set(err instanceof Error ? err.message : "Playback failed");
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
