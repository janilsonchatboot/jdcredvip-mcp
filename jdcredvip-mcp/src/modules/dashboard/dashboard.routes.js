import { Router } from "express";
import { requiresRole } from "#core/middlewares/auth.js";
import * as controller from "./dashboard.controller.js";

const router = Router();
const acesso = requiresRole("admin", "promotor");

router.get("/", acesso, controller.publicado);
router.get("/resumo", acesso, controller.resumo);
router.get("/ranking", acesso, controller.ranking);
router.get("/trend", acesso, controller.trend);

export default router;
