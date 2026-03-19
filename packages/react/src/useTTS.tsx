"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { AudioPlayer, type TTSStatus } from "@tts2go/core";
import { hasSpeechSynthesis, speakFallback, stopFallback } from "@tts2go/core";
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
  const mountedRef = useRef(true);

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      playerRef.current?.stop();
      playerRef.current = null;
    };
  }, []);

  const play = useCallback(async () => {
    setError(null);

    try {
      // If we already have a URL, play it directly
      if (url) {
        setStatus("playing");
        const player = new AudioPlayer();
        playerRef.current = player;

        player.onEnded = () => {
          if (mountedRef.current) setStatus("idle");
        };
        player.onError = () => {
          if (mountedRef.current) {
            setStatus("error");
            setError("Audio playback failed");
          }
        };

        await player.play(url);
        return;
      }

      // Try to play directly from CDN
      setStatus("loading");
      const cdnUrl = client.getCDNUrl(content, voiceId);

      const player = new AudioPlayer();
      playerRef.current = player;

      player.onEnded = () => {
        if (mountedRef.current) setStatus("idle");
      };
      player.onError = () => {
        // No-op: catch block below handles fallback to avoid double playback
      };

      try {
        setStatus("playing");
        setUrl(cdnUrl);
        await player.play(cdnUrl);
      } catch {
        if (!mountedRef.current) return;
        // Playback failed — fire request and use browser TTS
        client.request(content, voiceId).catch(() => {});
        if (hasSpeechSynthesis()) {
          setStatus("fallback");
          speakFallback(content);
          const estimatedDuration = Math.max(2000, content.length * 60);
          setTimeout(() => {
            if (mountedRef.current) setStatus("idle");
          }, estimatedDuration);
        } else {
          setStatus("error");
          setError("TTS not available");
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setStatus("error");
      setError(err instanceof Error ? err.message : "Playback failed");
    }
  }, [client, content, voiceId, url]);

  const stop = useCallback(() => {
    playerRef.current?.stop();
    playerRef.current = null;
    stopFallback();
    setStatus("idle");
  }, []);

  const pause = useCallback(() => {
    if (playerRef.current?.isPlaying) {
      playerRef.current.pause();
      setStatus("paused");
    }
  }, []);

  return { status, url, error, play, stop, pause };
}
