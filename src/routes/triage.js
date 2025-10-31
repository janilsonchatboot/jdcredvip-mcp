import { Router } from "express";

import { triageClient } from "../modules/triage/engine.js";

const router = Router();

router.post("/", (req, res) => {
  const resultado = triageClient(req.body ?? {});
  res.json(resultado);
});

export default router;
