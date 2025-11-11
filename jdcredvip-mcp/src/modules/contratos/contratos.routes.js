import { Router } from "express";
import { requiresRole } from "#core/middlewares/auth.js";
import * as controller from "./contratos.controller.js";

const router = Router();

router.get("/", requiresRole("admin", "promotor"), controller.listar);

export default router;
