/**
 * A2A (Agent-to-Agent) protocol client for discovering and interacting
 * with A2A-compatible agents.
 */

export interface A2AProvider {
  organization: string;
  url?: string;
}

export interface A2AInterface {
  url: string;
  protocolBinding: string;
  protocolVersion: string;
}

export interface A2AAgentCard {
  name: string;
  description: string;
  version: string;
  provider?: A2AProvider;
  capabilities?: Record<string, unknown>;
  skills?: Array<{ name: string; description: string }> | null;
  supportedInterfaces?: A2AInterface[];
  defaultInputModes?: string[] | null;
  defaultOutputModes?: string[] | null;
}

export interface A2AHealthStatus {
  healthy: boolean;
  latencyMs: number;
  error?: string;
}

export interface A2AAgent {
  url: string;
  card: A2AAgentCard;
  health: A2AHealthStatus;
}

const DEFAULT_TIMEOUT = 5000;

export async function fetchAgentCard(
  baseUrl: string,
  timeout = DEFAULT_TIMEOUT,
): Promise<A2AAgentCard> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(
      `${baseUrl}/.well-known/agent-card.json`,
      { signal: controller.signal },
    );
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function checkAgentHealth(
  baseUrl: string,
  timeout = DEFAULT_TIMEOUT,
): Promise<A2AHealthStatus> {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${baseUrl}/.well-known/agent-card.json`, {
      signal: controller.signal,
    });
    const latencyMs = Math.round(performance.now() - start);
    return { healthy: res.ok, latencyMs };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      healthy: false,
      latencyMs,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverAgent(baseUrl: string): Promise<A2AAgent> {
  const [card, health] = await Promise.all([
    fetchAgentCard(baseUrl),
    checkAgentHealth(baseUrl),
  ]);
  return { url: baseUrl, card, health };
}

export async function discoverAgents(
  urls: string[],
): Promise<A2AAgent[]> {
  const results = await Promise.allSettled(
    urls.map((url) => discoverAgent(url)),
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<A2AAgent> => r.status === "fulfilled",
    )
    .map((r) => r.value);
}
