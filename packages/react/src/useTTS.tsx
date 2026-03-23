"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  AudioPlayer,
  type TTSStatus,
  type FallbackHandle,
  hasSpeechSynthesis,
  speakFallback,
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
  const fallbackRef = useRef<FallbackHandle | null>(null);
  const mountedRef = useRef(true);
  const instanceIdRef = useRef(generateInstanceId());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      playerRef.current?.stop();
      playerRef.current = null;
      fallbackRef.current?.cancel();
      fallbackRef.current = null;
      releaseAudioLock(instanceIdRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stop();
    playerRef.current = null;
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

      // Deferred fire-and-forget — fully decoupled from current context
      setTimeout(() => {
        try { client.request(content, voiceId).catch(() => {}); } catch {}
      }, 0);

      if (hasSpeechSynthesis()) {
        setStatus("fallback");
        fallbackRef.current = speakFallback(content, () => {
          if (mountedRef.current) {
            releaseAudioLock(instanceIdRef.current);
            setStatus("idle");
          }
        });
      } else {
        releaseAudioLock(instanceIdRef.current);
        setStatus("error");
        setError("TTS not available");
      }
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
    }
  }, []);

  return { status, url, error, play, stop, pause };
}
