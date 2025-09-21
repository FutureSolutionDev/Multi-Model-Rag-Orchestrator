import {
  ChatMessage,
  EmbeddingsResponse,
  GenerateOptions,
  GenerateResponse,
  LLMProvider,
  ModelKind,
} from "../Interface";
import { withTimeout } from "../Utility";

export default class OllamaProvider implements LLMProvider {
  id = "ollama";
  label = "Ollama (Local)";
  kind: ModelKind[] = ["chat", "embed"];
  constructor(
    private baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    private defaultChatModel = "llama3",
    private defaultEmbedModel = "nomic-embed-text"
  ) {}
  async isHealthy() {
    try {
      const r = await fetch(`${this.baseUrl}/api/tags`);
      return r.ok;
    } catch {
      return false;
    }
  }
  async generate(
    messages: ChatMessage[],
    opts: GenerateOptions = {}
  ): Promise<GenerateResponse> {
    const model = opts.model ?? this.defaultChatModel;
    const started = Date.now();
    const prompt = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");
    const resp = await withTimeout(
      fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          options: { temperature: opts.temperature ?? 0.2 },
        }),
      }).then((r) => r.json()),
      opts.timeoutMs ?? 60_000,
      "ollama.generate"
    );
    const text = resp.response ?? "";
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
    const vectors: number[][] = [];
    for (const text of inputs) {
      const resp = await withTimeout(
        fetch(`${this.baseUrl}/api/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt: text }),
        }).then((r) => r.json()),
        opts.timeoutMs ?? 60_000,
        "ollama.embed"
      );
      vectors.push(resp.embedding ?? []);
    }
    return { providerId: this.id, model, vectors };
  }
}
