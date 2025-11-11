import { Router } from "express";
import { requiresRole } from "#core/middlewares/auth.js";
import * as controller from "./clientes.controller.js";

const router = Router();

router.get("/", requiresRole("admin", "promotor"), controller.listar);
router.get("/resumo", requiresRole("admin"), controller.resumo);

export default router;
