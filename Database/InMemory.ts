import { DocChunk } from "../Interface";
import crypto from "crypto";
type SearchOpts = { k?: number; filter?: (d: DocChunk) => boolean };
function normalize(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}
export class InMemoryVectorStore {
  private store: DocChunk[] = [];
  constructor(private embedder: (texts: string[]) => Promise<number[][]>) {}
  async upsert(
    docs: { id?: string; text: string; meta?: Record<string, any> }[]
  ) {
    const texts = docs.map((d) => d.text);
    const vectors = await this.embedder(texts);
    docs.forEach((d, i) => {
      const id = d.id ?? crypto.randomUUID();
      const vec = Array.isArray(vectors[i]) ? vectors[i] : [];
      if (!vec.length) return;
      if (
        this.store.length &&
        Array.isArray(this.store[0].vector) &&
        this.store[0].vector!.length !== vec.length
      ) {
        console.warn(
          `Vector dim mismatch: got ${vec.length}, expected ${
            this.store[0].vector!.length
          }. Skipping ${id}`
        );
        return;
      }
      const chunk: DocChunk = {
        id,
        text: d.text,
        vector: normalize(vec),
        meta: d.meta,
      };
      const idx = this.store.findIndex((s) => s.id === id);
      if (idx >= 0) this.store[idx] = chunk;
      else this.store.push(chunk);
    });
  }

  search(query: string, k = 5): DocChunk[] {
    throw new Error("Call searchWithVector");
  }
  stats() {
    return {
      count: this.store.length,
      dim: this.store[0]?.vector?.length ?? 0,
      sampleIds: this.store.slice(0, 10).map((d) => d.id),
    };
  }
  async searchWithVector(
    query: string,
    k = 5,
    opts: SearchOpts = {}
  ): Promise<DocChunk[]> {
    const [raw] = await this.embedder([query]);
    if (!Array.isArray(raw) || !raw.length) return [];
    const [qv] = await this.embedder([query]);
    console.log(
      "[VS] Q dim:",
      Array.isArray(qv) ? qv.length : "invalid",
      "storeDim:",
      this.store[0]?.vector?.length ?? 0,
      "count:",
      this.store.length
    );
    const pool = this.store.filter(
      (ch) => Array.isArray(ch.vector) && ch.vector.length > 0
    );
    if (!pool.length) return [];
    const scored = pool
      .map((ch) => ({
        ch,
        score: qv.reduce(
          (acc, v, i) => acc + v * (ch.vector as number[])[i],
          0
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((s) => ({
        ...s.ch,
        meta: { ...(s.ch.meta || {}), score: s.score },
      }));

    return scored;
  }
  clear() {
    this.store = [];
  }
  remove(id: string) {
    this.store = this.store.filter((d) => d.id !== id);
  }
  size() {
    return this.store.length;
  }
}
