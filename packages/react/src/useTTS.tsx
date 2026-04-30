"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  AudioPlayer,
  StreamingAudioPlayer,
  handleMiss,
  type TTSStatus,
  type FallbackHandle,
  acquireAudioLock,
  releaseAudioLock,
  generateInstanceId,
} from "@tts2go/core";
import { useTTS2GoClient } from "./TTS2GoProvider";

export interface UseTTSReturn {
  status: TTSStatus;
  url: string | null;
  error: string | null;
  play: () => void;
  stop: () => void;
  pause: () => void;
}

export function useTTS(content: string, voiceId: string): UseTTSReturn {
  const client = useTTS2GoClient();
  const [status, setStatus] = useState<TTSStatus>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const streamRef = useRef<StreamingAudioPlayer | null>(null);
  const fallbackRef = useRef<FallbackHandle | null>(null);
  const mountedRef = useRef(true);
  const instanceIdRef = useRef(generateInstanceId());

  // Cleanup on unmount. mountedRef must be re-asserted on every effect setup so
  // React 18+ StrictMode (which mounts → cleans up → re-mounts in dev) doesn't
  // leave it stuck at false on the second mount and silently drop callbacks.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      playerRef.current?.stop();
      playerRef.current = null;
      streamRef.current?.stop();
      streamRef.current = null;
      fallbackRef.current?.cancel();
      fallbackRef.current = null;
      releaseAudioLock(instanceIdRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stop();
    playerRef.current = null;
    streamRef.current?.stop();
    streamRef.current = null;
    fallbackRef.current?.cancel();
    fallbackRef.current = null;
    releaseAudioLock(instanceIdRef.current);
    setStatus("idle");
  }, []);

  const play = useCallback(async () => {
    // Stop any existing playback
    playerRef.current?.stop();
    playerRef.current = null;
    fallbackRef.current?.cancel();
    fallbackRef.current = null;

    // Stop any other playing TTS instance
    acquireAudioLock(instanceIdRef.current, stop);

    setError(null);
    setStatus("loading");

    const targetUrl = url || client.getCDNUrl(content, voiceId);

    let handled = false;
    function handleFailure() {
      if (handled || !mountedRef.current) return;
      handled = true;
      playerRef.current?.stop();
      playerRef.current = null;
      setUrl(null);

      // Try the streaming upgrade first; the helper falls through to browser
      // speech synthesis if the project isn't streaming-enabled.
      handleMiss(client, content, voiceId, {
        onStreamReady: () => {
          if (mountedRef.current) setStatus("loading");
        },
        onPlaybackStarted: () => {
          if (mountedRef.current) setStatus("playing");
        },
        onFallbackStarted: () => {
          if (mountedRef.current) setStatus("fallback");
        },
        onEnded: () => {
          if (!mountedRef.current) return;
          streamRef.current = null;
          fallbackRef.current = null;
          releaseAudioLock(instanceIdRef.current);
          setStatus("idle");
        },
        onError: () => {
          if (!mountedRef.current) return;
          streamRef.current = null;
          fallbackRef.current = null;
          releaseAudioLock(instanceIdRef.current);
          setStatus("error");
          setError("TTS not available");
        },
      }).then((result) => {
        if (!mountedRef.current) return;
        if (result.kind === "stream" && result.streamPlayer) {
          streamRef.current = result.streamPlayer;
        } else if (result.kind === "fallback" && result.fallback) {
          fallbackRef.current = result.fallback;
        } else if (result.kind === "none") {
          releaseAudioLock(instanceIdRef.current);
          setStatus("error");
          setError("TTS not available");
        }
      });
    }

    try {
      const player = new AudioPlayer();
      playerRef.current = player;

      player.onEnded = () => {
        if (mountedRef.current) {
          setUrl(targetUrl);
          releaseAudioLock(instanceIdRef.current);
          setStatus("idle");
        }
      };
      player.onError = handleFailure;

      setStatus("playing");
      await player.play(targetUrl);
    } catch {
      handleFailure();
    }
  }, [client, content, voiceId, url, stop]);

  const pause = useCallback(() => {
    if (playerRef.current?.isPlaying) {
      playerRef.current.pause();
      setStatus("paused");
    } else if (streamRef.current) {
      streamRef.current.pause();
      setStatus("paused");
    }
  }, []);

  return { status, url, error, play, stop, pause };
}
