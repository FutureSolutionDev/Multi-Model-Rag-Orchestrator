import { InMemoryVectorStore } from "Database";
import { ChatMessage } from "Interface";
import { MultiModelRouter } from "Router/Router";
export class RAGPipeline {
  constructor(
    private router: MultiModelRouter,
    private vs: InMemoryVectorStore
  ) {}
  getIndexStats() {
    return this.vs.stats();
  }
  async answer(
    question: string,
    opts?: {
      k?: number;
      system?: string;
      maxTokens?: number;
      temperature?: number;
      providerId?: string;
      model?: string;
    }
  ) {
    const topK = await this.vs.searchWithVector(question, opts?.k ?? 5);
    if (!topK.length) {
      const msg =
        opts?.system && opts.system.includes("أجب")
          ? "لا توجد معلومات كافية في الفهرس للإجابة على السؤال."
          : "Insufficient indexed context to answer this question.";
      return { providerId: "n/a", model: "n/a", output: msg, references: [] };
    }

    const context = topK.map((c, i) => `[${i + 1}] ${c.text}`).join("\n");
    const system =
      opts?.system ??
      "You are a helpful, precise assistant. Cite facts only from the provided CONTEXT.";

    const messages: ChatMessage[] = [
      { role: "system", content: system },
      {
        role: "user",
        content:
          `QUESTION: ${question}\n\nCONTEXT:\n${context}\n\n` +
          `INSTRUCTIONS: If the answer is not in the context, say you do not have enough information.`,
      },
    ];

    const res = await this.router.generate(messages, {
      maxTokens: opts?.maxTokens ?? 512,
      temperature: opts?.temperature ?? 0.2,
      providerId: opts?.providerId,
      model: opts?.model,
    });

    return {
      ...res,
      references: topK.map((c) => ({ id: c.id, meta: c.meta })),
    };
  }
}
