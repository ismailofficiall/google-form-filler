// Web version: a small server (local Node or Vercel functions) fetches and posts on behalf of the page.
const call = async (path, data) => {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const text = await r.text();
  let d;
  try { d = JSON.parse(text); }
  catch { throw new Error(`The server did not return data (HTTP ${r.status} from ${path}). If this is a Vercel site, the api folder is probably not deployed.`); }
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
};
const transport = {
  getForm: (url) => call("/api/get", { url }),
  post: async (action, pairs) => { try { return await call("/api/post", { action, pairs }); } catch { return { ok: false, status: 0 }; } },
};
