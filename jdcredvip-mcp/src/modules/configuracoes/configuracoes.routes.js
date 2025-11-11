import { Router } from "express";
import { requiresRole } from "#core/middlewares/auth.js";
import {
  listarBancosController,
  criarBancoController,
  atualizarBancoController,
  removerBancoController,
  listarPromotorasController,
  criarPromotoraController,
  atualizarPromotoraController,
  removerPromotoraController,
  listarProdutosController,
  criarProdutoController,
  atualizarProdutoController,
  removerProdutoController
} from "./configuracoes.controller.js";

const router = Router();
const somenteAdmin = requiresRole("admin");

router.get("/bancos", somenteAdmin, listarBancosController);
router.post("/bancos", somenteAdmin, criarBancoController);
router.put("/bancos/:id", somenteAdmin, atualizarBancoController);
router.delete("/bancos/:id", somenteAdmin, removerBancoController);

router.get("/promotoras", somenteAdmin, listarPromotorasController);
router.post("/promotoras", somenteAdmin, criarPromotoraController);
router.put("/promotoras/:id", somenteAdmin, atualizarPromotoraController);
router.delete("/promotoras/:id", somenteAdmin, removerPromotoraController);

router.get("/produtos", somenteAdmin, listarProdutosController);
router.post("/produtos", somenteAdmin, criarProdutoController);
router.put("/produtos/:id", somenteAdmin, atualizarProdutoController);
router.delete("/produtos/:id", somenteAdmin, removerProdutoController);

export default router;
