import {
  ChatMessage,
  EmbeddingsResponse,
  GenerateOptions,
  GenerateResponse,
  LLMProvider,
  ModelKind,
} from "../Interface";
import { withTimeout } from "../Utility";

export default class DeepSeekProvider implements LLMProvider {
  id = "deepseek";
  label = "DeepSeek";
  kind: ModelKind[] = ["chat"];
  constructor(
    private apiKey = process.env.DEEPSEEK_API_KEY!,
    private defaultChatModel = "deepseek-chat"
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
      fetch("https://api.deepseek.com/chat/completions", {
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
        }),
      }).then((r) => r.json()),
      opts.timeoutMs ?? 60_000,
      "deepseek.generate"
    );
    const text = resp.choices?.[0]?.message?.content ?? "";
    return {
      providerId: this.id,
      model,
      output: text,
      usage: { latencyMs: Date.now() - started },
    };
  }
}
