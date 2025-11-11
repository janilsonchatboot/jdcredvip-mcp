import { Router } from "express";
import { requiresRole } from "#core/middlewares/auth.js";
import * as controller from "./metas.controller.js";

const router = Router();
const leitura = requiresRole("admin", "promotor");
const somenteAdmin = requiresRole("admin");

router.post("/publicar", somenteAdmin, controller.publicar);
router.get("/", leitura, controller.listar);
router.get("/:id", leitura, controller.obter);
router.put("/:id", somenteAdmin, controller.atualizar);

export default router;
