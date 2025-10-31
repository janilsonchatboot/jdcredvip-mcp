import fs from "fs";
import path from "path";
export function loadAgentGuidelines() {
  const p = path.resolve("automacoes/agents/JD_CRED_VIP_OPERATING_GUIDELINES.md");
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "Diretrizes não encontradas.";
}