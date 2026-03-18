"use client";
import { createContext, useContext, useMemo } from "react";
import { TTS2GoClient, hasSpeechSynthesis, type TTS2GoConfig } from "@tts2go/core";
import type { ReactNode } from "react";

interface TTS2GoContextValue {
  client: TTS2GoClient;
  browserTTSSupported: boolean;
}

const TTS2GoContext = createContext<TTS2GoContextValue | null>(null);

export function TTS2GoProvider({ config, children }: { config: TTS2GoConfig; children: ReactNode }) {
  const client = useMemo(
    () => new TTS2GoClient(config),
    [config.apiKey, config.projectId, config.cdnBase, config.apiBase]
  );
  const browserTTSSupported = useMemo(() => hasSpeechSynthesis(), []);
  const value = useMemo(() => ({ client, browserTTSSupported }), [client, browserTTSSupported]);
  return <TTS2GoContext.Provider value={value}>{children}</TTS2GoContext.Provider>;
}

export function useTTS2GoContext(): TTS2GoContextValue {
  const ctx = useContext(TTS2GoContext);
  if (!ctx) throw new Error("useTTS2GoContext must be used within TTS2GoProvider");
  return ctx;
}

export function useTTS2GoClient(): TTS2GoClient {
  return useTTS2GoContext().client;
}
