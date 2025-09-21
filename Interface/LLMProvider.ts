import { ChatMessage, GenerateOptions, ModelKind } from "./Global";
import { EmbeddingsResponse, GenerateResponse } from "./Response";

export interface LLMProvider {
  id: string;                    // unique id (e.g., 'openai')
  label: string;                 // human name
  kind: ModelKind[];             // supported kinds
  isHealthy(): Promise<boolean>; // for circuit breaker
  generate?(messages: ChatMessage[], opts?: GenerateOptions): Promise<GenerateResponse>;
  embed?(inputs: string[], opts?: { model?: string; timeoutMs?: number }): Promise<EmbeddingsResponse>;
}