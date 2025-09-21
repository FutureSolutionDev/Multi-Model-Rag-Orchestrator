import {
  ChatMessage,
  EmbeddingsResponse,
  GenerateOptions,
  GenerateResponse,
  LLMProvider,
  ModelKind,
} from "../Interface";
import { withTimeout } from "../Utility";

export default class OpenAIProvider implements LLMProvider {
  id = "openai";
  label = "OpenAI";
  kind: ModelKind[] = ["chat", "embed"];
  constructor(
    private apiKey = process.env.OPENAI_API_KEY!,
    private defaultChatModel = "gpt-4o-mini",
    private defaultEmbedModel = "text-embedding-3-small"
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
    const resp = await withTimeout(
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxTokens ?? 512,
          top_p: opts.topP ?? 1,
          stop: opts.stop,
        }),
      }).then((r) => r.json()),
      opts.timeoutMs ?? 60_000,
      "openai.generate"
    );
    const text = resp.choices?.[0]?.message?.content ?? "";
    return {
      providerId: this.id,
      model,
      output: text,
      usage: {
        latencyMs: Date.now() - started,
        totalTokens: resp.usage?.total_tokens,
      },
    };
  }
  async embed(
    inputs: string[],
    opts: { model?: string; timeoutMs?: number } = {}
  ): Promise<EmbeddingsResponse> {
    const model = opts.model ?? this.defaultEmbedModel;
    const resp = await withTimeout(
      fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, input: inputs }),
      }).then((r) => r.json()),
      opts.timeoutMs ?? 60_000,
      "openai.embed"
    );
    const vectors = resp.data?.map((d: any) => d.embedding) ?? [];
    return { providerId: this.id, model, vectors };
  }
}
