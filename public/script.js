const $ = (sel) => document.querySelector(sel);
const base = () => $("#baseUrl").value.replace(/\/+$/, "").trim();
function setBusy(v) {
  $("#busy").style.display = v ? "inline-block" : "none";
}
function setStatus(msg) {
  $("#status").textContent = msg || "";
}
function fmtMs(ms) {
  return ms + " ms";
}
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else n.setAttribute(k, v);
  });
  kids.forEach((k) => {
    if (k != null) n.append(k.nodeType ? k : document.createTextNode(k));
  });
  return n;
}
async function call(method, path, body) {
  const t0 = performance.now();
  const res = await fetch(base() + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const t1 = performance.now();
  let data;
  try {
    data = await res.json();
  } catch {
    data = { ok: false, status: res.status, text: await res.text() };
  }
  return { ok: res.ok, ms: Math.round(t1 - t0), data };
}
function renderResult(obj) {
  const result = $("#result");
  result.innerHTML = "";
  if (!obj) {
    result.append(el("div", { class: "muted" }, "لا يوجد نتائج"));
    return;
  }
  if (obj.answer) {
    result.append(
      el("div", { class: "chip" }, "Model: " + (obj.model || "n/a"))
    );
    result.append(el("pre", {}, el("code", {}, obj.answer)));
  } else if (obj.output) {
    result.append(
      el("div", { class: "chip" }, "Model: " + (obj.model || "n/a"))
    );
    result.append(el("pre", {}, el("code", {}, obj.output)));
  }
  if (obj.references && obj.references.length) {
    result.append(el("div", { class: "muted" }, "References"));
    obj.references.forEach((r) => {
      const line = JSON.stringify(r, null, 0);
      result.append(el("div", { class: "ref mono" }, line));
    });
  }
  if (obj.error) {
    result.append(el("div", { class: "ref mono" }, "ERROR: " + obj.error));
  }
}
$("#btnHealth").addEventListener("click", async () => {
  setBusy(true);
  setStatus("Checking health...");
  try {
    const r = await call("GET", "/rag/health");
    setStatus("Health " + (r.ok ? "OK " : "FAIL ") + fmtMs(r.ms));
    renderResult(r.data);
  } catch (e) {
    setStatus("Health error");
  } finally {
    setBusy(false);
  }
});
$("#btnIngest").addEventListener("click", async () => {
  const cid = $("#cid").value.trim();
  if (!cid) {
    toast("اكتب Customer ID", "warn", { timeout: 3000 });
    return;
  }
  setBusy(true);
  setStatus("Ingesting customer " + cid + " ...");
  try {
    const r = await call(
      "POST",
      "/rag/ingest/customer/" + encodeURIComponent(cid)
    );
    setStatus("Ingest " + (r.ok ? "OK " : "FAIL ") + fmtMs(r.ms));
    renderResult(r.data);
  } catch (e) {
    setStatus("Ingest error");
  } finally {
    setBusy(false);
  }
});
$("#btnAsk").addEventListener("click", async () => {
  const q = $("#question").value.trim();
  if (!q) {
    toast("اكتب السؤال", "error", { timeout: 3000 });
    return;
  }
  const body = {
    question: q,
    top_k: parseInt($("#topk").value || "5", 10),
    language: $("#lang").value,
    customerId: $("#cid").value ? Number($("#cid").value) : undefined,
    provider: $("#provider").value || undefined,
    model: $("#model").value || undefined,
    maxTokens: parseInt($("#maxTokens").value || "512", 10),
    temperature: parseFloat($("#temperature").value || "0.2"),
    strictProvider: $("#strict").checked || undefined,
  };
  setBusy(true);
  setStatus("Asking...");
  try {
    const r = await call("POST", "/rag/query", body);
    setStatus("Ask " + (r.ok ? "OK " : "FAIL ") + fmtMs(r.ms));
    renderResult(r.data);
  } catch (e) {
    setStatus("Ask error");
  } finally {
    setBusy(false);
  }
});
$("#meta").textContent = new Date().toLocaleString();
$("#btnStats").addEventListener("click", async () => {
  setBusy(true);
  setStatus("Fetching stats...");
  try {
    const r = await call("GET", "/rag/debug/stats");
    const out = r.data || { ok: false };
    const txt = JSON.stringify(out, null, 2);
    const box = document.querySelector("#statsBox");
    if (box) box.textContent = txt;
    setStatus("Stats " + (r.ok ? "OK " : "FAIL ") + fmtMs(r.ms));
  } catch (e) {
    setStatus("Stats error");
    const box = document.querySelector("#statsBox");
    if (box) box.textContent = String(e);
  } finally {
    setBusy(false);
  }
});

(function () {
  const POSITIONS = {
    "top-right": {
      top: "18px",
      right: "18px",
      bottom: "auto",
      left: "auto",
      col: true,
    },
    "top-left": {
      top: "18px",
      left: "18px",
      right: "auto",
      bottom: "auto",
      col: true,
    },
    "bottom-right": {
      bottom: "18px",
      right: "18px",
      top: "auto",
      left: "auto",
      col: true,
    },
    "bottom-left": {
      bottom: "18px",
      left: "18px",
      right: "auto",
      top: "auto",
      col: true,
    },
  };
  function ensureContainer(position = "top-right") {
    let el = document.querySelector(".toast-container");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast-container";
      document.body.appendChild(el);
    }
    const p = POSITIONS[position] || POSITIONS["top-right"];
    Object.assign(el.style, {
      insetBlockStart: p.top ?? "auto",
      insetBlockEnd: p.bottom ?? "auto",
      insetInlineStart: p.left ?? "auto",
      insetInlineEnd: p.right ?? "auto",
      flexDirection: p.col ? "column" : "column",
    });
    return el;
  }
  function toast(message, type = "info", opts = {}) {
    const {
      timeout = 3000,
      position = "top-left",
      ariaLive = "polite",
    } = opts;
    const container = ensureContainer(position);
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", ariaLive);
    const bar = document.createElement("div");
    bar.className = "bar";
    const msg = document.createElement("div");
    msg.className = "msg";
    msg.textContent = message;
    const btn = document.createElement("button");
    btn.className = "close";
    btn.innerHTML = "×";
    btn.setAttribute("aria-label", "Close");
    t.append(bar, msg, btn);
    container.appendChild(t);

    let hideTimer = setTimeout(() => close(), timeout);
    function close() {
      clearTimeout(hideTimer);
      t.classList.add("hide");
      t.addEventListener("animationend", () => t.remove(), { once: true });
    }
    btn.addEventListener("click", close);
    t.addEventListener("click", (e) => {
      if (e.target !== btn) close();
    });

    return { close };
  }
  window.toast = toast;
})();
