import { Router } from "express";
import { requiresRole } from "#core/middlewares/auth.js";
import * as controller from "./core-status.controller.js";

const router = Router();

router.get("/status", requiresRole("admin", "promotor"), controller.status);

export default router;
