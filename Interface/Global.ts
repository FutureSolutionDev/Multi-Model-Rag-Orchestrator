export type ModelKind = "chat" | "embed";
export interface GenerateOptions {
  providerId?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  system?: string;
  stop?: string[];
  timeoutMs?: number;
  metadata?: Record<string, any>;
  strictProvider?: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}
export type RouteStrategy = "failover" | "roundRobin" | "weighted" | "smart";

export interface ProviderConfig {
  id: string;
  weight?: number;
  maxRPS?: number;
  maxCostPer1K?: number;
  latencySLAms?: number;
  enabled?: boolean;
}

export interface DocChunk {
  id: string;
  text: string;
  vector?: number[];
  meta?: Record<string, any>;
}
