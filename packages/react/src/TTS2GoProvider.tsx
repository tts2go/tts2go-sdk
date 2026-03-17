"use client";
import { createContext, useContext, useMemo } from "react";
import { TTS2GoClient, type TTS2GoConfig } from "@tts2go/core";
import type { ReactNode } from "react";

const TTS2GoContext = createContext<TTS2GoClient | null>(null);

export function TTS2GoProvider({ config, children }: { config: TTS2GoConfig; children: ReactNode }) {
  const client = useMemo(
    () => new TTS2GoClient(config),
    [config.apiKey, config.projectId, config.cdnBase, config.apiBase]
  );
  return <TTS2GoContext.Provider value={client}>{children}</TTS2GoContext.Provider>;
}

export function useTTS2GoClient(): TTS2GoClient {
  const client = useContext(TTS2GoContext);
  if (!client) throw new Error("useTTS2GoClient must be used within TTS2GoProvider");
  return client;
}
