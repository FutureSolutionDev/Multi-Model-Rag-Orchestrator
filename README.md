# 🧠 Multi-Model RAG Orchestrator  

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

**Maintained by Future Solutions Dev: Sabry Dawood**  

بناء مرن لاستدعاء أكثر من 10 مزوّدين لنماذج الذكاء الاصطناعي مع دعم مدمج لـ **RAG** لفهرسة ومعالجة بياناتك.

بناء مرن لاستدعاء أكثر من 10 مزوّدين لنماذج الذكاء الاصطناعي مع دعم مدمج لـ **RAG** لفهرسة ومعالجة بياناتك.

---

## 🖼️ معاينة النظام

![Preview](Docs/Assets/Preview.png)

---

## 🌐 اللغات

English | [English](Docs/README.en.md)

---

## 🚀 نظرة عامة

طبقة تنسيق ذكية تعمل فوق عدة مزوّدين (OpenAI, Anthropic, Gemini, Mistral, Cohere, Ollama, Groq, DeepSeek, xAI, Azure OpenAI)، تختار تلقائيًا أفضل مزوّد وفقًا لزمن الاستجابة والتكلفة.  
تدعم:

- راوتر ذكي مع استراتيجيات `failover`, `roundRobin`, `weighted`, `smart`
- **RAG** مدمج مع متجر متجهات داخل الذاكرة أو قابل للاستبدال بـ pgvector/Pinecone
- دوائر حماية (Circuit Breaker) + مهلات زمنية + إعادة محاولات
- مقاييس الأداء والاستخدام (latency/tokens/cost)
- قابلية توسعة سريعة بإضافة مزوّد جديد عبر Class صغيرة

---

## 📦 التثبيت والتشغيل

```bash
cp .env.example .env   # أضف مفاتيح مزوّداتك
npm install
npm run dev
# يعمل على http://localhost:7070
```

---

## 🔌 نقاط الدخول (API Endpoints)

| Method | Endpoint                     | وصف |
|-------|------------------------------|-----|
| GET   | `/`                          | يعرض صفحة index.html من مجلد public |
| GET   | `/rag/health`                | فحص الصحة |
| GET   | `/rag/debug/stats`           | عرض إحصائيات الفهرس (لأغراض التصحيح) |
| POST  | `/rag/ingest/customer/:id`   | فهرسة بيانات عميل محدد |
| POST  | `/rag/ingest/all`            | فهرسة جميع العملاء دفعة واحدة (يعرض عدد الناجح والفاشل) |
| POST  | `/rag/query`                 | استعلام RAG مع خيارات مثل `top_k`, `language`, `customerId`, `provider`, `model` |

---

## 🛠️ طريقة العمل (Internal Flow)

1. استقبال السؤال وتوحيد صياغته  
2. تحويله إلى متجه (Embedding)  
3. البحث المتجهي (Top-K)  
4. بناء السياق من أفضل المقاطع  
5. توجيه الطلب لأفضل مزوّد وفق الاستراتيجية  
6. توليد الإجابة  
7. إرفاق المراجع والمقاييس  
8. إرجاع النتيجة لواجهة الـ API أو الـ UI  

---

## 📚 فهرسة بياناتك

- قسم المستندات إلى مقاطع 500–1000 حرف بتداخل 50–150 حرف
- أنشئ Embeddings وخزنها مع الميتاداتا (المصدر، التاريخ، التصنيف)
- أعد فهرسة الأجزاء المتأثرة فقط عند التحديث
- يمكن دعم لغات متعددة بإضافة حقول لغة للمساعدة في الاسترجاع

---

## 🔐 الأمان والمراقبة

- خزن مفاتيح الوصول في Secret Manager
- لا تسجّل بيانات حساسة في الـ Logs
- راقب الاستهلاك والزمن عبر OpenTelemetry أو pino + Grafana/ELK

---

## ⚡ تحسين الأداء

- استخدم Caching (مثل Redis) للسياقات والإجابات
- نفذ Batch Embeddings لتقليل الاستدعاءات
- استعمل pgvector أو Pinecone بدلاً من التخزين في الذاكرة عند الإنتاج
- عدّل `k`, `temperature`, حجم المقاطع لتحسين جودة النتائج

---

## ❓ أسئلة شائعة

- **ماذا لو لا أملك كل المفاتيح؟** → سيعمل فقط بالمزوّدين المتاحين ويعطّل الباقي تلقائيًا  
- **هل يمكن تشغيله بدون إنترنت؟** → نعم عبر Ollama محليًا  
- **كيف أضيف مزوّد جديد؟** → أنشئ Class جديدة تنفذ `LLMProvider` وأضفها في `providers[]`  

---

## 🧾 مثال سريع (TypeScript)

```ts
import { Rag, Router, VectorStore } from "./Router";

async function demo(){
  // 1) Seed some knowledge
  await VectorStore.upsert([
    { id: 'doc-1', text: 'Our refund policy allows returns within 30 days of purchase for undamaged items.' },
    { id: 'doc-2', text: 'Support hours are Sunday to Thursday, 9:00 to 18:00 Africa/Cairo time.' },
    { id: 'doc-3', text: 'Contract ABC for Future Solutions Dev expires on 2025-10-12 with monthly fee 10,000 EGP.' },
    { id: 'doc-4', text: 'Invoices are due within 14 days of issue date unless otherwise stated.' },
    { id: 'doc-5', text: 'KPI dashboard aggregates ContractHistories to compute on-time payment rates.' },
  ]);
  // 2) Ask a question through RAG
  const q = 'متى ينتهي عقد Future Solutions Dev وما هي القيمة الشهرية؟';
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

```

---

## 📜 الترخيص

هذا المشروع مرخّص تحت **[Apache License 2.0](./LICENSE)**  
يمكنك استخدام الكود، تعديله، وإعادة توزيعه سواء لأغراض شخصية أو تجارية مع الحفاظ على الإسناد لـ Future Solutions Dev.
