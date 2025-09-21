import {
  ChatMessage,
  GenerateOptions,
  GenerateResponse,
  LLMProvider,
  ModelKind,
} from "../Interface";
import { withTimeout } from "../Utility";

export default class XAIProvider implements LLMProvider {
  id = "xai";
  label = "xAI (Grok)";
  kind: ModelKind[] = ["chat"];
  constructor(
    private apiKey = process.env.XAI_API_KEY!,
    private defaultChatModel = "grok-2-latest"
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
      fetch("https://api.x.ai/v1/chat/completions", {
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
      "xai.generate"
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
