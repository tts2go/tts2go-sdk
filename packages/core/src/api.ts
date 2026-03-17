export interface APIConfig {
  apiBase: string;
  apiKey: string;
}

export async function sdkFetch<T>(config: APIConfig, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${config.apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}
