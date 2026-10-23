const allowed = (u) => { try { return ["docs.google.com", "forms.gle"].includes(new URL(u).hostname); } catch { return false; } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { action, pairs } = req.body || {};
  if (!allowed(action) || !Array.isArray(pairs)) return res.status(400).json({ error: "Blocked" });
  const body = new URLSearchParams();
  pairs.forEach(([k, v]) => body.append(k, v));
  let status = 0;
  try { status = (await fetch(action, { method: "POST", body, redirect: "manual" })).status; } catch {}
  res.status(200).json({ ok: status === 200 || status === 302, status });
}
