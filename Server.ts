import "dotenv/config";
import express from "express";
import pino from "pino";
import cors from "cors";
import path from "path";
import { Rag } from "./Router";
import { upsertCustomerToRAG } from "./Pipeline/DBIngestion";
import { getAllCustomerIds } from "./Database/SQL";
const app = express();
const logger = pino({ level: "info" });
app.use(express.json({ limit: "2mb" }));
app.use(cors());
app.use(express.static("public"));
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/rag/health", (_req, res) => res.json({ ok: true }));

app.post("/rag/ingest/customer/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const result = await upsertCustomerToRAG(id);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.get("/rag/debug/stats", (_req, res) => {
  try {
    res.json(Rag.getIndexStats());
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.post("/rag/ingest/all", async (_req, res) => {
  try {
    const ids = await getAllCustomerIds(); 
    let ok = 0,
      fail = 0;
    for (const id of ids) {
      try {
        await upsertCustomerToRAG(id);
        ok++;
      } catch {
        fail++;
      }
    }
    res.json({ ok: true, indexed: ok, failed: fail });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.post("/rag/query", async (req, res) => {
  const {
    question,
    top_k = 5,
    language = "auto",
    customerId,
    provider,
    model,
  } = req.body || {};
  if (!question || String(question).trim().length < 3) {
    return res.status(400).json({ ok: false, error: "question is required" });
  }
  try {
    const sys =
      language === "ar"
        ? "أجب بدقة وباختصار اعتمادًا فقط على السياق المرفق. إن لم تكفِ المعلومات فلتصرّح بذلك."
        : "Answer precisely and briefly using ONLY the provided context. If insufficient, say so.";
    const q = customerId
      ? `Focus on customer id=${customerId}. ${question}`
      : String(question);
    const result = await Rag.answer(q, {
      k: top_k,
      temperature: 0.2,
      maxTokens: 512,
      system: sys,
      providerId: provider || "openai",
      model,
    });
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const port = Number(process.env.PORT || 7070);
app.listen(port, () =>
  logger.info(`RAG service listening on http://localhost:${port}`)
);
