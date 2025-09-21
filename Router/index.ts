import { InMemoryVectorStore } from "../Database";
import { RAGPipeline } from "../Pipeline";
import { ProviderCfg, Providers } from "../Provider";
import { MultiModelRouter } from "./Router";
const Router = new MultiModelRouter(Providers, ProviderCfg, "smart");
const VectorStore = new InMemoryVectorStore(async (texts: string[]) => {
  // Prefer OpenAI/Azure/Cohere/Gemini embeddings depending on availability.
  try {
    return (await Router.embed(texts)).vectors;
  } catch {
    // fallback: Ollama local embeddings
    const p = Providers.find((p) => p.id === "ollama");
    // if no Ollama provider found, throw error While there is No Any embedding provider available
    if (!p?.embed) throw new Error("No embedding provider available");
    return (await p.embed(texts)).vectors;
  }
});
const Rag = new RAGPipeline(Router, VectorStore);
export { Router, Rag, VectorStore };
