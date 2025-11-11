import { Router } from "express";
import { requiresRole } from "#core/middlewares/auth.js";
import * as controller from "./triagem.controller.js";

const router = Router();

router.post("/", requiresRole("admin", "promotor"), controller.avaliar);

export default router;
