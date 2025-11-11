import clientesRoutes from "./modules/clientes/clientes.routes.js";
import contratosRoutes from "./modules/contratos/contratos.routes.js";
import importacaoRoutes from "./modules/importacao/importacao.routes.js";
import rankingRoutes from "./modules/ranking/ranking.routes.js";
import metasRoutes from "./modules/metas/metas.routes.js";
import triagemRoutes from "./modules/triagem/triagem.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import followupsRoutes from "./modules/followups/followups.routes.js";
import configuracoesRoutes from "./modules/configuracoes/configuracoes.routes.js";
import auditoriaRoutes from "./modules/auditoria/auditoria.routes.js";
import cmsRoutes from "./modules/cms/cms.routes.js";
import integracoesRoutes from "./modules/integracoes/integracoes.routes.js";
import coreStatusRoutes from "./modules/core-status/core-status.routes.js";

export default function registerRoutes(app) {
  app.use("/api/clientes", clientesRoutes);
  app.use("/api/contratos", contratosRoutes);
  app.use("/import", importacaoRoutes);
  app.use("/api/ranking", rankingRoutes);
  app.use("/api/metas", metasRoutes);
  app.use("/triagem", triagemRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/followups", followupsRoutes);
  app.use("/api/config", configuracoesRoutes);
  app.use("/api/auditoria", auditoriaRoutes);
  app.use("/api/cms", cmsRoutes);
  app.use("/api/integracoes", integracoesRoutes);
  app.use("/integracoes", integracoesRoutes); // legado
  app.use("/api/core", coreStatusRoutes);
}
