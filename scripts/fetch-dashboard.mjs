import {
  getDashboardMetrics,
  hasGoogleCredentials,
  missingGoogleEnv
} from "../src/index.js";

if (!hasGoogleCredentials) {
  console.error(
    "Variáveis de ambiente ausentes:",
    missingGoogleEnv().join(", ")
  );
  process.exit(1);
}

try {
  const dados = await getDashboardMetrics();
  console.log(JSON.stringify(dados, null, 2));
} catch (error) {
  console.error("Falha ao consultar o Google Sheets:", error.message);
  process.exit(1);
}
