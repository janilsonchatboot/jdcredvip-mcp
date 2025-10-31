import express from "express";
import fetch from "node-fetch";
import { loadAgentGuidelines } from "../core/agent-guidelines.js";
const router = express.Router();
const CODEX_URL = process.env.CODEX_URL || "https://jdcredvip-mcp.onrender.com/api/ask";
router.post("/", async (req, res) => {
  const { message, channel = "blog", meta = {} } = req.body || {};
  const system = loadAgentGuidelines();
  try {
    const r = await fetch(CODEX_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, input: message, meta: { channel, ...meta } }) });
    const data = await r.json();
    res.json({ ok: true, reply: data.reply ?? data, raw: data });
  } catch (e) { res.status(500).json({ ok: false, error: "Falha ao contatar o motor cognitivo", detail: e.message }); }
});
export default router;