import { getCoreStatus } from "./core-status.service.js";

export async function status(_req, res) {
  try {
    const dados = await getCoreStatus();
    res.json({ status: "ok", dados });
  } catch (error) {
    console.error("Erro ao consultar status GAIA Core:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Falha ao consultar status do GAIA Core."
    });
  }
}
