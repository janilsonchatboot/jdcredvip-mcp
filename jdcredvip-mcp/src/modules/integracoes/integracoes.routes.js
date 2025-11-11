import { Router } from "express";
import {
  simularCrefazController,
  contratarCrefazController,
  listarPropostasCrefazController,
  sincronizarNexxoController,
  listarContratosNexxoController,
  listarComissoesNexxoController,
  statusIntegracoesController
} from "./integracoes.controller.js";

const router = Router();

router.post("/crefaz/simular", simularCrefazController);
router.post("/crefaz/contratar", contratarCrefazController);
router.get("/crefaz/propostas", listarPropostasCrefazController);

router.post("/nexxo/sync", sincronizarNexxoController);
router.get("/nexxo/contratos", listarContratosNexxoController);
router.get("/nexxo/comissoes", listarComissoesNexxoController);

router.get("/status", statusIntegracoesController);

export default router;
