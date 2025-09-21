import {
  ChatMessage,
  EmbeddingsResponse,
  GenerateOptions,
  GenerateResponse,
  LLMProvider,
  ModelKind,
} from "../Interface";
import { withTimeout } from "../Utility";

export default class CohereProvider implements LLMProvider {
  id = "cohere";
  label = "Cohere";
  kind: ModelKind[] = ["chat", "embed"];
  constructor(
    private apiKey = process.env.COHERE_API_KEY!,
    private defaultChatModel = "command-r-plus",
    private defaultEmbedModel = "embed-english-v3.0"
  ) {}
  async isHealthy() {
    return !!this.apiKey;
  }
  async generate(
    messages: ChatMessage[],
    opts: GenerateOptions = {}
  ): Promise<GenerateResponse> {
    const model = opts.model ?? this.defaultChatModel;
    const started = Date.now();
    const input = messages
      .filter((m) => m.role !== "system")
      .map((m) => m.content)
      .join("\n");
    const resp = await withTimeout(
      fetch("https://api.cohere.ai/v1/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          message: input,
          max_tokens: opts.maxTokens ?? 512,
          temperature: opts.temperature ?? 0.2,
        }),
      }).then((r) => r.json()),
      opts.timeoutMs ?? 60_000,
      "cohere.generate"
    );
    const text = resp.text ?? resp.output_text ?? "";
    return {
      providerId: this.id,
      model,
      output: text,
      usage: { latencyMs: Date.now() - started },
    };
  }
  async embed(
    inputs: string[],
    opts: { model?: string; timeoutMs?: number } = {}
  ): Promise<EmbeddingsResponse> {
    const model = opts.model ?? this.defaultEmbedModel;
    const resp = await withTimeout(
      fetch("https://api.cohere.ai/v1/embed", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          texts: inputs,
          input_type: "search_document",
        }),
      }).then((r) => r.json()),
      opts.timeoutMs ?? 60_000,
      "cohere.embed"
    );
    return { providerId: this.id, model, vectors: resp.embeddings ?? [] };
  }
}
