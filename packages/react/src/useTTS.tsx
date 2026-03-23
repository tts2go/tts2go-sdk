"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  AudioPlayer,
  type TTSStatus,
  type FallbackHandle,
  hasSpeechSynthesis,
  speakFallback,
  stopFallback,
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
    setError(null);

    // Stop any existing playback from this instance
    playerRef.current?.stop();
    playerRef.current = null;
    fallbackRef.current?.cancel();
    fallbackRef.current = null;

    // Stop any other playing TTS instance
    acquireAudioLock(instanceIdRef.current, stop);

    try {
      const targetUrl = url || client.getCDNUrl(content, voiceId);
      const isFirstAttempt = !url;

      if (!isFirstAttempt) {
        // We have a confirmed-working URL — play with error handling
        setStatus("playing");
        const player = new AudioPlayer();
        playerRef.current = player;

        player.onEnded = () => {
          if (mountedRef.current) {
            releaseAudioLock(instanceIdRef.current);
            setStatus("idle");
          }
        };
        player.onError = () => {
          if (mountedRef.current) {
            releaseAudioLock(instanceIdRef.current);
            setStatus("error");
            setError("Audio playback failed");
          }
        };

        await player.play(targetUrl);
        return;
      }

      // First attempt — try CDN, fallback to browser TTS on failure
      setStatus("loading");

      const player = new AudioPlayer();
      playerRef.current = player;

      let handled = false;
      function handleCdnFailure() {
        if (handled || !mountedRef.current) return;
        handled = true;
        player.stop();
        playerRef.current = null;

        // Fire-and-forget request so the audio is ready next time
        try { client.request(content, voiceId).catch(() => {}); } catch {}

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

      player.onEnded = () => {
        if (mountedRef.current) {
          releaseAudioLock(instanceIdRef.current);
          setStatus("idle");
        }
      };
      player.onError = handleCdnFailure;

      try {
        setStatus("playing");
        await player.play(targetUrl);
        // CDN playback started successfully — cache the URL
        if (mountedRef.current) setUrl(targetUrl);
      } catch {
        handleCdnFailure();
      }
    } catch (err) {
      if (!mountedRef.current) return;
      releaseAudioLock(instanceIdRef.current);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Playback failed");
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
