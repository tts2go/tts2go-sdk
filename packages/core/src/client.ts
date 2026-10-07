import type {
  TTS2GoConfig,
  CheckResponse,
  RequestResponse,
  Voice,
  TTSStatus,
  TTSRequestOptions,
} from "./types";
import { buildCDNUrl } from "./cdn";
import { sdkFetch } from "./api";
import { resolveLanguage, type TTSLanguage } from "./languages";

const DEFAULT_CDN_BASE = "https://cdn.tts2go.com";
const DEFAULT_API_BASE = "https://backend.tts2go.com/api/v1";

const warnedLanguages = new Set<string>();

function warnUnsupportedLanguage(value: string): void {
  if (warnedLanguages.has(value)) return;
  warnedLanguages.add(value);
  if (typeof console !== "undefined") {
    console.warn(
      `[tts2go] Unsupported language "${value}" — sending the request without a language. ` +
        `See SUPPORTED_LANGUAGES in @tts2go/core for the accepted codes.`
    );
  }
}

/** @internal test helper: forget which unsupported values were already warned about. */
export function _resetLanguageWarnings(): void {
  warnedLanguages.clear();
}

type ResolvedConfig = Required<Omit<TTS2GoConfig, "language">> & Pick<TTS2GoConfig, "language">;

type EventMap = {
  statusChange: TTSStatus;
};

export class TTS2GoClient {
  private config: ResolvedConfig;
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

  /**
   * The effective language for a call: the per-call option, else the client
   * default, resolved to a supported code. Unsupported values warn once and
   * resolve to `undefined` (the request is sent without a language).
   */
  resolveRequestLanguage(opts?: TTSRequestOptions): TTSLanguage | undefined {
    // An empty per-call value (e.g. an empty attribute) means "not set".
    const raw = opts?.language || this.config.language;
    if (!raw) return undefined;
    const resolved = resolveLanguage(raw);
    if (!resolved) warnUnsupportedLanguage(String(raw));
    return resolved;
  }

  /** Builds the /sdk/request body. `language` is only present when set. */
  private requestBody(content: string, voiceId: string, opts?: TTSRequestOptions): string {
    const language = this.resolveRequestLanguage(opts);
    return JSON.stringify(
      language ? { content, voice_id: voiceId, language } : { content, voice_id: voiceId }
    );
  }

  async request(
    content: string,
    voiceId: string,
    opts?: TTSRequestOptions
  ): Promise<RequestResponse> {
    return sdkFetch<RequestResponse>(
      { apiBase: this.config.apiBase, apiKey: this.config.apiKey },
      "/sdk/request",
      {
        method: "POST",
        body: this.requestBody(content, voiceId, opts),
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
    voiceId: string,
    opts?: TTSRequestOptions
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
      body: this.requestBody(content, voiceId, opts),
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

  /** The client's default language, resolved to a supported code (if any). */
  get language(): TTSLanguage | undefined {
    return resolveLanguage(this.config.language);
  }

  get hideTTSIfNoFallback(): boolean {
    return this.config.hideTTSIfNoFallback;
  }
}
