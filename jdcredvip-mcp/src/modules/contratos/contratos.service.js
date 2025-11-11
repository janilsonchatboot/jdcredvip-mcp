import { listarContratosNexxo } from "../integracoes/nexxo.service.js";

export async function listarContratos(filtros = {}) {
  return listarContratosNexxo(filtros);
}

export default {
  listarContratos
};
