import {
  ChatMessage,
  EmbeddingsResponse,
  GenerateOptions,
  GenerateResponse,
  LLMProvider,
  ModelKind,
} from "../Interface";
import { withTimeout } from "../Utility";

export default class GoogleGenAIProvider implements LLMProvider {
  id = 'google'; label = 'Google (Gemini)'; kind: ModelKind[] = ['chat', 'embed'];
  constructor(private apiKey = process.env.GOOGLE_API_KEY!, private defaultChatModel = 'gemini-1.5-pro', private defaultEmbedModel = 'text-embedding-004') {}
  async isHealthy() { return !!this.apiKey; }
  async generate(messages: ChatMessage[], opts: GenerateOptions = {}): Promise<GenerateResponse> {
    const model = opts.model ?? this.defaultChatModel;
    const sys = messages.find(m => m.role==='system')?.content;
    const parts = messages.filter(m=>m.role!=='system').map(m=>({ role: m.role, parts: [{ text: m.content }] }));
    const started = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const resp = await withTimeout(fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ contents: parts, systemInstruction: sys?{ parts:[{text:sys}]}:undefined, generationConfig: { maxOutputTokens: opts.maxTokens ?? 512, temperature: opts.temperature ?? 0.2, topP: opts.topP ?? 1 } }) }).then(r=>r.json()), opts.timeoutMs ?? 60_000, 'google.generate');
    const text = resp.candidates?.[0]?.content?.parts?.map((p: any)=>p.text).join('') ?? '';
    return { providerId: this.id, model, output: text, usage: { latencyMs: Date.now()-started } };
  }
  async embed(inputs: string[], opts: { model?: string; timeoutMs?: number } = {}): Promise<EmbeddingsResponse> {
    const model = opts.model ?? this.defaultEmbedModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${this.apiKey}`;
    // batch one-by-one for simplicity
    const vectors: number[][] = [];
    for (const text of inputs) {
      const resp = await withTimeout(fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ content: { parts: [{ text }] } }) }).then(r=>r.json()), opts.timeoutMs ?? 60_000, 'google.embed');
      vectors.push(resp.embedding?.values ?? []);
    }
    return { providerId: this.id, model, vectors };
  }
}
