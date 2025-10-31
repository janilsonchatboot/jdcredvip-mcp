import express from "express";
import { loadAgentGuidelines } from "../core/agent-guidelines.js";
const router = express.Router();
router.get("/", (_req, res) => {
  res.json({ status: "ok", updatedAt: new Date().toISOString(), text: loadAgentGuidelines() });
});
export default router;