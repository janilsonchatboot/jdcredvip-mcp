import express from "express";
import { createServer } from "@modelcontext/server";
import dotenv from "dotenv";
import triagem from "./handlers/triagem.js";
import planilhas from "./handlers/planilhas.js";

dotenv.config();
const PORT = process.env.PORT || 8080;

const mcp = createServer({
  name: "jdcredvip-mcp",
  version: "1.0.0",
  actions: { triagem, planilhas }
});

const app = express();
app.use(express.json());

app.get("/", (_req, res) => res.json({ status: "🧠 JD CRED VIP MCP ativo", versao: "1.0.0" }));

app.listen(PORT, () => {
  console.log(`🚀 MCP rodando em http://localhost:${PORT}`);
  mcp.start(PORT + 1);
});