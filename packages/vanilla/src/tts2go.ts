import {
  TTS2GoClient,
  AudioPlayer,
  hasSpeechSynthesis,
  speakFallback,
  stopFallback,
} from "@tts2go/core";
import type { TTS2GoConfig, TTSStatus, Voice } from "@tts2go/core";

export type TTSEventMap = {
  statusChange: TTSStatus;
  urlReady: string;
  error: string;
  play: void;
  pause: void;
  stop: void;
  timeUpdate: { currentTime: number; duration: number };
};

export type TTSEventCallback<K extends keyof TTSEventMap> = (value: TTSEventMap[K]) => void;

export interface TTSInstance {
  play: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  getStatus: () => TTSStatus;
  getUrl: () => string | null;
  getError: () => string | null;
  destroy: () => void;
  on: <K extends keyof TTSEventMap>(event: K, cb: TTSEventCallback<K>) => void;
  off: <K extends keyof TTSEventMap>(event: K, cb: TTSEventCallback<K>) => void;
}

export class TTS2Go {
  private client: TTS2GoClient;

  constructor(config: TTS2GoConfig) {
    this.client = new TTS2GoClient(config);
  }

  /** Create a TTS instance bound to specific content and voice */
  create(content: string, voiceId: string): TTSInstance {
    const client = this.client;

    let status: TTSStatus = "idle";
    let url: string | null = null;
    let error: string | null = null;
    let player: AudioPlayer | null = null;
    let destroyed = false;

    const listeners = new Map<keyof TTSEventMap, Set<(value: any) => void>>();

    function emit<K extends keyof TTSEventMap>(event: K, value: TTSEventMap[K]) {
      listeners.get(event)?.forEach((cb) => cb(value));
    }

    function setStatus(s: TTSStatus) {
      status = s;
      emit("statusChange", s);
    }

    function useBrowserFallback() {
      if (hasSpeechSynthesis()) {
        setStatus("fallback");
        speakFallback(content);
        const estimatedDuration = Math.max(2000, content.length * 60);
        setTimeout(() => {
          if (!destroyed) setStatus("idle");
        }, estimatedDuration);
      } else {
        error = "TTS not available";
        setStatus("error");
        emit("error", error);
      }
    }

    const instance: TTSInstance = {
      async play() {
        error = null;
        try {
          if (url) {
            setStatus("playing");
            emit("play", undefined as any);
            player = new AudioPlayer();
            player.onEnded = () => {
              if (!destroyed) setStatus("idle");
            };
            player.onError = () => {
              if (!destroyed) {
                error = "Audio playback failed";
                setStatus("error");
                emit("error", error);
              }
            };
            player.onTimeUpdate = (currentTime, duration) => {
              if (!destroyed) emit("timeUpdate", { currentTime, duration });
            };
            await player.play(url);
            return;
          }

          // Try to play directly from CDN
          setStatus("loading");
          const cdnUrl = client.getCDNUrl(content, voiceId);
          try {
            player = new AudioPlayer();
            player.onEnded = () => {
              if (!destroyed) setStatus("idle");
            };
            player.onError = () => {
              // No-op: catch block below handles fallback to avoid double playback
            };
            player.onTimeUpdate = (currentTime, duration) => {
              if (!destroyed) emit("timeUpdate", { currentTime, duration });
            };

            setStatus("playing");
            emit("play", undefined as any);
            url = cdnUrl;
            emit("urlReady", cdnUrl);
            await player.play(cdnUrl);
          } catch {
            if (destroyed) return;
            // Playback failed — fire request and use browser TTS
            client.request(content, voiceId).catch(() => {});
            useBrowserFallback();
          }
        } catch (err) {
          if (destroyed) return;
          const msg = err instanceof Error ? err.message : "Playback failed";
          error = msg;
          setStatus("error");
          emit("error", msg);
        }
      },

      stop() {
        player?.stop();
        player = null;
        stopFallback();
        setStatus("idle");
        emit("stop", undefined as any);
      },

      pause() {
        if (player?.isPlaying) {
          player.pause();
          setStatus("paused");
          emit("pause", undefined as any);
        }
      },

      resume() {
        if (player?.isPaused) {
          player.resume();
          setStatus("playing");
          emit("play", undefined as any);
        }
      },

      getStatus: () => status,
      getUrl: () => url,
      getError: () => error,

      destroy() {
        destroyed = true;
        instance.stop();
        listeners.clear();
      },

      on<K extends keyof TTSEventMap>(event: K, cb: TTSEventCallback<K>) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(cb);
      },

      off<K extends keyof TTSEventMap>(event: K, cb: TTSEventCallback<K>) {
        listeners.get(event)?.delete(cb);
      },
    };

    return instance;
  }

  /** Whether the browser supports native speech synthesis (fallback TTS) */
  get browserTTSSupported(): boolean {
    return hasSpeechSynthesis();
  }

  /** Get available voices */
  async getVoices(): Promise<Voice[]> {
    return this.client.getVoices();
  }

  /** One-shot: generate and play audio immediately */
  async generate(content: string, voiceId: string): Promise<TTSInstance> {
    const instance = this.create(content, voiceId);
    await instance.play();
    return instance;
  }
}
