import { Router } from "express";
import { requiresRole } from "#core/middlewares/auth.js";
import * as controller from "./cms.controller.js";

const router = Router();
const leitura = requiresRole("admin", "promotor");
const somenteAdmin = requiresRole("admin");

router.get("/posts", leitura, controller.listar);
router.get("/posts/:id", leitura, controller.obter);
router.post("/posts", somenteAdmin, controller.criar);
router.put("/posts/:id", somenteAdmin, controller.atualizar);
router.delete("/posts/:id", somenteAdmin, controller.remover);

export default router;
