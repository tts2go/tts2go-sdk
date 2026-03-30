import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TTS2GoProvider } from "@tts2go/react";
import App from "./App";

const config = {
  apiKey: "tts_6eaea2b30538d0568124543533f7bb15401b5c1f9fa1d8ba6566df4f2c8644b7",
  projectId: "e6785bb8-a3d2-4fc9-bc01-57b77c295f66",
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TTS2GoProvider config={config}>
      <App />
    </TTS2GoProvider>
  </StrictMode>
);
