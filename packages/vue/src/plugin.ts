import type { App, InjectionKey } from "vue";
import { TTS2GoClient, type TTS2GoConfig } from "@tts2go/core";

export const TTS2GoKey: InjectionKey<TTS2GoClient> = Symbol("tts2go");

export const TTS2GoPlugin = {
  install(app: App, config: TTS2GoConfig) {
    const client = new TTS2GoClient(config);
    app.provide(TTS2GoKey, client);
  },
};
