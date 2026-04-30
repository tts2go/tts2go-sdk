import type { TTS2GoConfig, CheckResponse, RequestResponse, Voice, TTSStatus } from "./types";
import { buildCDNUrl } from "./cdn";
import { sdkFetch } from "./api";

const DEFAULT_CDN_BASE = "https://cdn.tts2go.com";
const DEFAULT_API_BASE = "https://backend.tts2go.com/api/v1";

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
      streamingWarmupMs: 400,
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

  /**
   * Calls POST /sdk/request signalling streaming readiness. The server may
   * respond with a queued JSON record (existing behaviour) or a streaming
   * audio body if the project has streaming enabled for this voice.
   */
  async requestOrStream(
    content: string,
    voiceId: string
  ): Promise<
    | { kind: "queued"; response: RequestResponse }
    | { kind: "stream"; body: ReadableStream<Uint8Array>; mime: string }
  > {
    const res = await fetch(`${this.config.apiBase}/sdk/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
        Accept: "audio/mpeg, application/json",
        "X-TTS-Stream": "1",
      },
      body: JSON.stringify({ content, voice_id: voiceId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}) as any);
      throw new Error(body.error || `Request failed: ${res.status}`);
    }

    const type = res.headers.get("Content-Type") || "";
    if (type.startsWith("audio/") && res.body) {
      return { kind: "stream", body: res.body, mime: type };
    }
    const response = (await res.json()) as RequestResponse;
    return { kind: "queued", response };
  }

  get streamingWarmupMs(): number {
    return this.config.streamingWarmupMs ?? 400;
  }

  async getVoices(): Promise<Voice[]> {
    return sdkFetch<Voice[]>(
      { apiBase: this.config.apiBase, apiKey: this.config.apiKey },
      "/sdk/voices"
    );
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
