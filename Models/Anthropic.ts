import {
  ChatMessage,
  EmbeddingsResponse,
  GenerateOptions,
  GenerateResponse,
  LLMProvider,
  ModelKind,
} from "../Interface";
import { withTimeout } from "../Utility";

export default class AnthropicProvider implements LLMProvider {
  id = "anthropic";
  label = "Anthropic";
  kind: ModelKind[] = ["chat"];
  constructor(
    private apiKey = process.env.ANTHROPIC_API_KEY!,
    private defaultChatModel = "claude-3-5-sonnet-20240620"
  ) {}
  async isHealthy() {
    return !!this.apiKey;
  }
  async generate(
    messages: ChatMessage[],
    opts: GenerateOptions = {}
  ): Promise<GenerateResponse> {
    const model = opts.model ?? this.defaultChatModel;
    const system = messages.find((m) => m.role === "system")?.content;
    const user = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));
    const started = Date.now();
    const resp = await withTimeout(
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          system,
          max_tokens: opts.maxTokens ?? 512,
          temperature: opts.temperature ?? 0.2,
          messages: user,
        }),
      }).then((r) => r.json()),
      opts.timeoutMs ?? 60_000,
      "anthropic.generate"
    );
    const text = resp.content?.[0]?.text ?? "";
    return {
      providerId: this.id,
      model,
      output: text,
      usage: { latencyMs: Date.now() - started },
    };
  }
}
