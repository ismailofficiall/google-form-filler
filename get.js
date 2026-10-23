const allowed = (u) => { try { return ["docs.google.com", "forms.gle"].includes(new URL(u).hostname); } catch { return false; } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const url = req.body?.url;
  if (!allowed(url)) return res.status(400).json({ error: "Please paste a Google Forms link." });
  try {
    const r = await fetch(url, { redirect: "follow" });
    res.status(200).json({ finalUrl: r.url, html: await r.text() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
