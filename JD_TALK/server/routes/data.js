import express from "express";
import { listTab } from "../core/sheets.js";
const router = express.Router();
router.get("/tab/:name", async (req, res) => {
  try { const rows = await listTab(req.params.name); res.json({ ok: true, tab: req.params.name, rows }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
export default router;