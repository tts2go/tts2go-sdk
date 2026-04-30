import type { TTS2GoClient } from "./client";
import { StreamingAudioPlayer } from "./streamingAudio";
import { hasSpeechSynthesis, speakFallback } from "./fallback";
import type { FallbackHandle } from "./fallback";

export interface HandleMissCallbacks {
  onStreamReady?: () => void;
  onPlaybackStarted?: () => void;
  onEnded?: () => void;
  onError?: (err: unknown) => void;
  onFallbackStarted?: () => void;
}

export interface HandleMissResult {
  kind: "stream" | "fallback" | "none";
  streamPlayer?: StreamingAudioPlayer;
  fallback?: FallbackHandle;
}

/**
 * The path invoked when the CDN lookup misses. Hits /sdk/request with a stream
 * upgrade hint. If the server responds with audio bytes, plays them via MSE.
 * Otherwise falls back to browser speech synthesis (if available).
 */
export async function handleMiss(
  client: TTS2GoClient,
  content: string,
  voiceId: string,
  callbacks: HandleMissCallbacks = {}
): Promise<HandleMissResult> {
  let result: { kind: "queued" | "stream"; body?: ReadableStream<Uint8Array>; mime?: string } | null = null;
  try {
    const r = await client.requestOrStream(content, voiceId);
    if (r.kind === "stream") {
      result = { kind: "stream", body: r.body, mime: r.mime };
    } else {
      result = { kind: "queued" };
    }
  } catch (err) {
    callbacks.onError?.(err);
  }

  if (result?.kind === "stream" && result.body && StreamingAudioPlayer.supported) {
    const player = new StreamingAudioPlayer({ warmupMs: client.streamingWarmupMs });
    player.onEnded = () => callbacks.onEnded?.();
    player.onPlaybackStarted = () => callbacks.onPlaybackStarted?.();
    player.onFirstByte = () => callbacks.onStreamReady?.();
    player.onError = (err) => {
      // If the stream failed before playback actually started we still have a
      // chance to fall back to browser TTS; after playback has begun we just
      // surface the error (the user has already heard partial audio).
      if (!player.playbackHasStarted && hasSpeechSynthesis()) {
        speakFallback(
          content,
          () => callbacks.onEnded?.(),
          () => callbacks.onError?.(new Error("speechSynthesis failed"))
        );
        callbacks.onFallbackStarted?.();
      } else {
        callbacks.onError?.(err);
      }
    };
    try {
      await player.play(result.body);
      return { kind: "stream", streamPlayer: player };
    } catch (err) {
      // play() can throw on MSE setup; fall through to browser TTS
      callbacks.onError?.(err);
    }
  }

  if (hasSpeechSynthesis()) {
    const handle = speakFallback(
      content,
      () => callbacks.onEnded?.(),
      () => callbacks.onError?.(new Error("speechSynthesis failed"))
    );
    callbacks.onFallbackStarted?.();
    return { kind: "fallback", fallback: handle };
  }

  return { kind: "none" };
}
