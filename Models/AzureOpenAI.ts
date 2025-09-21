import {
  ChatMessage,
  EmbeddingsResponse,
  GenerateOptions,
  GenerateResponse,
  LLMProvider,
  ModelKind,
} from "../Interface";
import { withTimeout } from "../Utility";

export default class AzureOpenAIProvider implements LLMProvider {
  id = "azure-openai";
  label = "Azure OpenAI";
  kind: ModelKind[] = ["chat", "embed"];
  constructor(
    private endpoint = process.env.AZURE_OPENAI_ENDPOINT!,
    private apiKey = process.env.AZURE_OPENAI_KEY!,
    private deployment = "gpt-4o",
    private embedDeployment = "text-embedding-3-small"
  ) {}
  async isHealthy() {
    return !!this.endpoint && !!this.apiKey;
  }
  async generate(
    messages: ChatMessage[],
    opts: GenerateOptions = {}
  ): Promise<GenerateResponse> {
    const model = this.deployment;
    const started = Date.now();
    const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=2024-02-01`;
    const resp = await withTimeout(
      fetch(url, {
        method: "POST",
        headers: { "api-key": this.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxTokens ?? 512,
        }),
      }).then((r) => r.json()),
      opts.timeoutMs ?? 60_000,
      "azure.generate"
    );
    const text = resp.choices?.[0]?.message?.content ?? "";
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
    const url = `${this.endpoint}/openai/deployments/${this.embedDeployment}/embeddings?api-version=2024-02-01`;
    const resp = await withTimeout(
      fetch(url, {
        method: "POST",
        headers: { "api-key": this.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ input: inputs }),
      }).then((r) => r.json()),
      opts.timeoutMs ?? 60_000,
      "azure.embed"
    );
    const vectors = resp.data?.map((d: any) => d.embedding) ?? [];
    return { providerId: this.id, model: this.embedDeployment, vectors };
  }
}
