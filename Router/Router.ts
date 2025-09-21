import CircuitBreaker from "../Breaker";
import {
  ChatMessage,
  EmbeddingsResponse,
  GenerateOptions,
  GenerateResponse,
  LLMProvider,
  ProviderConfig,
  RouteStrategy,
} from "../Interface";
import { setTimeout as delay } from "timers/promises";
type WithGenerate = LLMProvider & { generate: NonNullable<LLMProvider['generate']> };
type WithEmbed    = LLMProvider & { embed: NonNullable<LLMProvider['embed']> };

function hasGenerate(p: LLMProvider | undefined): p is WithGenerate {
  return !!p && typeof p.generate === 'function';
}
function hasEmbed(p: LLMProvider | undefined): p is WithEmbed {
  return !!p && typeof p.embed === 'function';
}
export class MultiModelRouter {
  private providers: LLMProvider[] = [];
  private cfg: ProviderConfig[] = [];
  private cb: Record<string, CircuitBreaker> = {};
  private rrIdx = 0;
  constructor(
    providers: LLMProvider[],
    cfg: ProviderConfig[],
    private strategy: RouteStrategy = "smart"
  ) {
    this.providers = providers;
    this.cfg = cfg;
    for (const p of providers) this.cb[p.id] = new CircuitBreaker();
  }
  setStrategy(s: RouteStrategy) {
    this.strategy = s;
  }
  getProvider(id: string) {
    return this.providers.find((p) => p.id === id);
  }

private eligible(exclude: Set<string> = new Set()): LLMProvider[] {
  return this.providers.filter(p => {
    if (exclude.has(p.id)) return false;
    const conf = this.cfg.find(c => c.id === p.id);
    const enabled = conf?.enabled ?? true;
    return enabled && this.cb[p.id].canPass();
  });
}
private pick(messages: ChatMessage[], exclude: Set<string> = new Set()): WithGenerate | undefined {
  const list = this.eligible(exclude).filter(hasGenerate);
  if (!list.length) return undefined;

  switch (this.strategy) {
    case 'failover':
      return list[0];
    case 'roundRobin':
      return list[(this.rrIdx++) % list.length];
    case 'weighted': {
      const pool = list.flatMap(p => {
        const w = this.cfg.find(c => c.id === p.id)?.weight ?? 1;
        return Array(Math.max(1, w)).fill(p);
      });
      return pool[Math.floor(Math.random() * pool.length)];
    }
    case 'smart':
    default: {
      const sorted = list.sort((a, b) => {
        const ca = this.cfg.find(c => c.id === a.id); const cb = this.cfg.find(c => c.id === b.id);
        const la = ca?.latencySLAms ?? 2000; const lb = cb?.latencySLAms ?? 2000;
        const wa = ca?.weight ?? 1;          const wb = cb?.weight ?? 1;
        return la - lb || wb - wa;
      });
      return sorted[0];
    }
  }
}
async generate(messages: ChatMessage[], opts: GenerateOptions = {}): Promise<GenerateResponse> {
  const tried = new Set<string>();
  if (opts.providerId) {
    const chosen = this.getProvider(opts.providerId);
    if (!hasGenerate(chosen)) {
      throw new Error(`Unknown or non-chat provider: ${opts.providerId}`);
    }
    if (!this.cb[chosen.id].canPass()) {
      if (opts.strictProvider) throw new Error(`Provider circuit open: ${chosen.id}`);
    } else {
      try {
        const res = await chosen.generate(messages, { ...opts, maxTokens: opts.maxTokens ?? 512 });
        this.cb[chosen.id].recordSuccess();
        return res;
      } catch (e) {
        this.cb[chosen.id].recordFailure();
        tried.add(chosen.id);
        if (opts.strictProvider) throw e;
      }
    }
  }
  for (let attempts = 0; attempts < this.providers.length; attempts++) {
    const p = this.pick(messages, tried);
    if (!p) throw new Error(`No available providers for chat (tried: ${[...tried].join(', ') || 'none'})`);
    tried.add(p.id);
    try {
      const res = await p.generate(messages, { ...opts, maxTokens: opts.maxTokens ?? 512 });
      this.cb[p.id].recordSuccess();
      return res;
    } catch {
      this.cb[p.id].recordFailure();
      await delay(100 + attempts * 200);
      continue;
    }
  }
  throw new Error(`All providers failed: ${[...tried].join(', ')}`);
}

async embed(inputs: string[], opts: { model?: string; timeoutMs?: number; providerId?: string } = {}): Promise<EmbeddingsResponse> {
  if (opts.providerId) {
    const p = this.getProvider(opts.providerId);
    if (!hasEmbed(p)) throw new Error(`Embedding provider not available: ${opts.providerId}`);
    try {
      const res = await p.embed(inputs, opts);
      this.cb[p.id].recordSuccess();
      return res;
    } catch {
      this.cb[p.id].recordFailure();
    }
  }
  const candidates = this.eligible().filter(hasEmbed);
  if (!candidates.length) throw new Error('No embedding providers available');
  for (const p of candidates) {
    try {
      const res = await p.embed(inputs, opts);
      this.cb[p.id].recordSuccess();
      return res;
    } catch {
      this.cb[p.id].recordFailure();
    }
  }
  throw new Error('All embedding providers failed');
}

}
