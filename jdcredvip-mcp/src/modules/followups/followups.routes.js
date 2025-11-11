import { Router } from "express";
import { requiresRole } from "#core/middlewares/auth.js";
import * as controller from "./followups.controller.js";

const router = Router();
const acessoPadrao = requiresRole("admin", "promotor");

router.get("/", acessoPadrao, controller.listar);
router.get("/:id", acessoPadrao, controller.obter);
router.post("/", acessoPadrao, controller.criar);
router.put("/:id", acessoPadrao, controller.atualizar);

export default router;
