
export interface GenerateResponse {
  providerId: string;
  model: string;
  output: string;
  finishReason?: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number; latencyMs?: number; costUSD?: number };
}

export interface EmbeddingsResponse {
  providerId: string;
  model: string;
  vectors: number[][]; // one per input
}