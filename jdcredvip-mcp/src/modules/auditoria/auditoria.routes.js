import { Router } from "express";
import { requiresRole } from "#core/middlewares/auth.js";
import * as controller from "./auditoria.controller.js";

const router = Router();

router.get("/integracoes", requiresRole("admin"), controller.listarIntegracoes);

export default router;
