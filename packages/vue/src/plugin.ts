import type { App, InjectionKey } from "vue";
import { TTS2GoClient, hasSpeechSynthesis, type TTS2GoConfig } from "@tts2go/core";

export interface TTS2GoContext {
  client: TTS2GoClient;
  browserTTSSupported: boolean;
}

export const TTS2GoKey: InjectionKey<TTS2GoContext> = Symbol("tts2go");

export const TTS2GoPlugin = {
  install(app: App, config: TTS2GoConfig) {
    const client = new TTS2GoClient(config);
    app.provide(TTS2GoKey, { client, browserTTSSupported: hasSpeechSynthesis() });
  },
};
