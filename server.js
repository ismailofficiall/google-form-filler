import express from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

const TYPES = { 0: "short", 1: "paragraph", 2: "radio", 3: "dropdown", 4: "checkbox", 5: "scale", 9: "date", 10: "time" };

// ---------- Read the form ----------
app.post("/api/parse", async (req, res) => {
  try {
    const r = await fetch(req.body.url, { redirect: "follow" });
    const html = await r.text();
    const m = html.match(/FB_PUBLIC_LOAD_DATA_ = (.*?);<\/script>/s);
    if (!m) return res.status(400).json({ error: "Could not read this form. It may need sign-in or the link is wrong." });
    const data = JSON.parse(m[1]);
    let sections = 0;
    const questions = [];
    for (const i of data[1][1] || []) {
      if (i[3] === 8) { sections++; continue; }
      if (!i[4]) continue;
      if (i[3] === 7) {
        const es = i[4];
        questions.push({
          title: i[1] || "Grid", type: "grid", required: !!es[0][2],
          options: (es[0][1] || []).map(o => o[0]),
          rows: es.map(e => ({ entry: e[0], label: (e[3] || [""])[0] })),
        });
        continue;
      }
      const e = i[4][0], raw = e[1] || [];
      questions.push({
        title: i[1] || "Untitled question",
        type: TYPES[i[3]] || "unsupported",
        entry: e[0],
        required: !!e[2],
        options: raw.map(o => (o[4] ? "Other" : o[0])),
        otherIndex: raw.findIndex(o => o[4]),
      });
    }
    const action = r.url.split("?")[0].replace(/\/viewform$/, "/formResponse");
    res.json({ title: data[3] || "Untitled form", action, sections, questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Generate answers ----------
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const lines = (a) => (a || []).filter(Boolean);
const shuffle = (a) => a.map(x => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
const pad = (n) => String(n).padStart(2, "0");
const mins = (s) => { const [h, m] = (s || "00:00").split(":").map(Number); return h * 60 + m; };
const pick = (w) => {
  const total = w.reduce((a, b) => a + b, 0);
  if (!total) return Math.floor(Math.random() * w.length);
  let r = Math.random() * total;
  for (let i = 0; i < w.length; i++) if ((r -= w[i]) < 0) return i;
  return w.length - 1;
};
function textPick(c, list) {
  if (c.mode !== "balanced") return rnd(list);
  if (!c.deck || !c.deck.length) c.deck = shuffle(list); // each answer used evenly before repeating
  return c.deck.pop();
}

function answer(q, c) {
  const k = `entry.${q.entry}`;
  const other = () => { const l = lines(c.other); return l.length ? rnd(l) : "Other"; };
  const otherPairs = (t) => [[k, "__other_option__"], [`${k}.other_option_response`, t]];
  switch (q.type) {
    case "radio": case "dropdown": case "scale": {
      const i = pick(c.weights || q.options.map(() => 1));
      if (i === q.otherIndex) { const t = other(); return { pairs: otherPairs(t), val: "Other", text: t }; }
      return { pairs: [[k, q.options[i]]], val: q.options[i], text: q.options[i] };
    }
    case "checkbox": {
      let idx = q.options.map((_, i) => i).filter(i => Math.random() * 100 < (c.probs?.[i] ?? 50));
      if (!idx.length && q.required) idx = [pick(c.probs || q.options.map(() => 1))];
      const pairs = [], vals = [];
      idx.forEach(i => {
        if (i === q.otherIndex) pairs.push(...otherPairs(other())); else pairs.push([k, q.options[i]]);
        vals.push(q.options[i]);
      });
      return { pairs, val: vals, text: vals.join(", ") };
    }
    case "grid": {
      const pairs = [], parts = [];
      q.rows.forEach((r, ri) => {
        const v = q.options[pick(c.rows?.[ri] || q.options.map(() => 1))];
        pairs.push([`entry.${r.entry}`, v]);
        parts.push(`${r.label}: ${v}`);
      });
      return { pairs, text: parts.join("; ") };
    }
    case "short": case "paragraph": {
      const a = lines(c.answers);
      if (!a.length) break;
      const v = textPick(c, a);
      return { pairs: [[k, v]], text: v };
    }
    case "date": {
      const f = new Date(c.from), t = new Date(c.to);
      if (isNaN(f) || isNaN(t)) break;
      const d = new Date(f.getTime() + Math.random() * (t - f));
      return { pairs: [[`${k}_year`, d.getUTCFullYear()], [`${k}_month`, d.getUTCMonth() + 1], [`${k}_day`, d.getUTCDate()]], text: d.toISOString().slice(0, 10) };
    }
    case "time": {
      const a = mins(c.from), b = Math.max(mins(c.to), a);
      const m = Math.floor(a + Math.random() * (b - a + 1));
      return { pairs: [[`${k}_hour`, Math.floor(m / 60)], [`${k}_minute`, m % 60]], text: `${pad(Math.floor(m / 60))}:${pad(m % 60)}` };
    }
  }
  return { pairs: [], text: "" };
}

function gen(qs) {
  const pairs = [], row = {}, chosen = {};
  for (const q of qs) {
    let c = q.config || {};
    for (const r of q.rules || []) { // first matching rule replaces this question's settings
      const v = chosen[r.q];
      if (v !== undefined && (Array.isArray(v) ? v.includes(r.value) : v === r.value)) { c = r.config; break; }
    }
    const a = answer(q, c);
    chosen[q.idx] = a.val;
    row[`${q.idx + 1}. ${q.title}`] = a.text;
    pairs.push(...a.pairs);
  }
  return { pairs, row };
}

// ---------- Preview (nothing is sent) ----------
app.post("/api/preview", (req, res) => {
  const rows = Array.from({ length: 10 }, () => gen(req.body.questions).row);
  res.json({ rows });
});

// ---------- Send ----------
app.post("/api/submit", async (req, res) => {
  const { action, sections, questions, count, delayMs, windowMin } = req.body;
  const n = Math.min(Math.max(+count || 1, 1), 500);
  const base = +windowMin > 0 ? (windowMin * 60000) / n : +delayMs || 1000;
  let stopped = false;
  res.on("close", () => { if (!res.writableEnded) stopped = true; });
  res.setHeader("Content-Type", "application/x-ndjson");

  for (let i = 1; i <= n && !stopped; i++) {
    const { pairs, row } = gen(questions);
    const body = new URLSearchParams();
    pairs.forEach(([k, v]) => body.append(k, v));
    if (sections > 0) body.append("pageHistory", Array.from({ length: sections + 1 }, (_, j) => j).join(","));
    let status = 0;
    try { status = (await fetch(action, { method: "POST", body, redirect: "manual" })).status; } catch {}
    res.write(JSON.stringify({ i, n, ok: status === 200 || status === 302, status, row }) + "\n");
    if (i < n) await new Promise(r => setTimeout(r, base * (0.5 + Math.random())));
  }
  res.end();
});

app.listen(3000, () => console.log("Open http://localhost:3000"));
