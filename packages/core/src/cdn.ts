import { createHash } from "./index";

export function buildCDNUrl(cdnBase: string, projectId: string, content: string, voiceId: string): string {
  const hash = contentHash(content, projectId, voiceId);
  return `${cdnBase}/${projectId}/${hash}.mp3`;
}

export function contentHash(content: string, projectId: string, voiceId: string): string {
  return createHash(content + projectId + voiceId);
}
