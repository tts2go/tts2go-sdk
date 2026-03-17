export interface TTS2GoConfig {
  apiKey: string;
  projectId: string;
  cdnBase?: string;
  apiBase?: string;
  hideTTSIfNoFallback?: boolean;
}

export interface Voice {
  id: string;
  name: string;
  description: string;
  preview_url: string;
}

export interface CheckResponse {
  exists: boolean;
  url?: string;
}

export interface RequestResponse {
  id: string;
  status: string;
  message?: string;
}

export type TTSStatus = "idle" | "loading" | "playing" | "paused" | "error" | "fallback";

export interface PollOptions {
  pollInterval?: number;
  maxAttempts?: number;
}

export interface PollResult {
  url: string;
  status: string;
}
