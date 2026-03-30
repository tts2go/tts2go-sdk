import { createApp } from "vue";
import { TTS2GoPlugin } from "@tts2go/vue";
import App from "./App.vue";

const app = createApp(App);

app.use(TTS2GoPlugin, {
  apiKey: "tts_6eaea2b30538d0568124543533f7bb15401b5c1f9fa1d8ba6566df4f2c8644b7",
  projectId: "e6785bb8-a3d2-4fc9-bc01-57b77c295f66",
});

app.mount("#app");
