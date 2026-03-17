import type { TTS2GoConfig, CheckResponse, RequestResponse, Voice, TTSStatus, PollOptions, PollResult } from "./types";
import { buildCDNUrl } from "./cdn";
import { sdkFetch } from "./api";

const DEFAULT_CDN_BASE = "https://cdn.tts2go.dev";
const DEFAULT_API_BASE = "https://api.tts2go.dev/api/v1";

type EventMap = {
  statusChange: TTSStatus;
};

export class TTS2GoClient {
  private config: Required<TTS2GoConfig>;
  private listeners: Map<keyof EventMap, Set<(value: any) => void>> = new Map();

  constructor(config: TTS2GoConfig) {
    this.config = {
      cdnBase: DEFAULT_CDN_BASE,
      apiBase: DEFAULT_API_BASE,
      hideTTSIfNoFallback: false,
      ...config,
    };
  }

  getCDNUrl(content: string, voiceId: string): string {
    return buildCDNUrl(this.config.cdnBase, this.config.projectId, content, voiceId);
  }

  async check(content: string, voiceId: string): Promise<CheckResponse> {
    const url = this.getCDNUrl(content, voiceId);
    try {
      const res = await fetch(url, { method: "HEAD" });
      return { exists: res.ok, url: res.ok ? url : undefined };
    } catch {
      return { exists: false };
    }
  }

  async request(content: string, voiceId: string): Promise<RequestResponse> {
    return sdkFetch<RequestResponse>(
      { apiBase: this.config.apiBase, apiKey: this.config.apiKey },
      "/sdk/request",
      {
        method: "POST",
        body: JSON.stringify({ content, voice_id: voiceId }),
      }
    );
  }

  async getVoices(): Promise<Voice[]> {
    return sdkFetch<Voice[]>(
      { apiBase: this.config.apiBase, apiKey: this.config.apiKey },
      "/sdk/voices"
    );
  }

  async requestAndPoll(
    content: string,
    voiceId: string,
    opts?: PollOptions
  ): Promise<PollResult> {
    const pollInterval = opts?.pollInterval ?? 1500;
    const maxAttempts = opts?.maxAttempts ?? 20;

    // 1. Check CDN first
    this.emit("statusChange", "loading");
    const existing = await this.check(content, voiceId);
    if (existing.exists && existing.url) {
      return { url: existing.url, status: "ready" };
    }

    // 2. Make generation request
    await this.request(content, voiceId);

    // 3. Poll CDN until available
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(pollInterval);
      const result = await this.check(content, voiceId);
      if (result.exists && result.url) {
        return { url: result.url, status: "ready" };
      }
    }

    throw new Error("Audio generation timed out");
  }

  on<K extends keyof EventMap>(event: K, callback: (value: EventMap[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<K extends keyof EventMap>(event: K, callback: (value: EventMap[K]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit<K extends keyof EventMap>(event: K, value: EventMap[K]): void {
    this.listeners.get(event)?.forEach((cb) => cb(value));
  }

  get projectId(): string {
    return this.config.projectId;
  }

  get hideTTSIfNoFallback(): boolean {
    return this.config.hideTTSIfNoFallback;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
