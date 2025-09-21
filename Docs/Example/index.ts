import { Rag, Router, VectorStore } from "../../Router";

async function demo(){
  // 1) Seed some knowledge
  await VectorStore.upsert([
    { id: 'doc-1', text: 'Our refund policy allows returns within 30 days of purchase for undamaged items.' },
    { id: 'doc-2', text: 'Support hours are Sunday to Thursday, 9:00 to 18:00 Africa/Cairo time.' },
    { id: 'doc-3', text: 'Contract ABC for Future Solutions expires on 2025-10-12 with monthly fee 10,000 EGP.' },
    { id: 'doc-4', text: 'Invoices are due within 14 days of issue date unless otherwise stated.' },
    { id: 'doc-5', text: 'KPI dashboard aggregates ContractHistories to compute on-time payment rates.' },
  ]);

  // 2) Ask a question through RAG
  const q = 'متى ينتهي عقد Future Solutions وما هي القيمة الشهرية؟';
  const ans = await Rag.answer(q, { k: 4, temperature: 0.1 });
  console.log('\n=== ANSWER (RAG via multi-model router) ===');
  console.log({ output: ans.output, provider: ans.providerId, model: ans.model, refs: ans.references });

  // 3) Raw chat (no RAG) using router
  const chat = await Router.generate([
    { role: 'system', content: 'You are an expert CTO assistant. Answer concisely.' },
    { role: 'user', content: 'Compare OpenAI and Anthropic briefly.' },
  ], { temperature: 0.3, maxTokens: 200 });
  console.log('\n=== RAW CHAT (router) ===');
  console.log(chat);
}

// Only run demo when invoked directly
if (require.main === module) {
  demo().catch(e => { console.error(e); process.exit(1); });
}
