import { db, closeDatabase } from "../config/database.js";

async function backfillPaymentDates() {
  const result = await db("imported_records")
    .whereNull("data_pagamento")
    .update({
      data_pagamento: db.raw("COALESCE(data_operacao, created_at)")
    });

  console.log(`Atualizados ${result} registros sem data_pagamento.`);
}

backfillPaymentDates()
  .then(() => closeDatabase())
  .catch(async (error) => {
    console.error("Erro ao atualizar data_pagamento:", error);
    await closeDatabase();
    process.exitCode = 1;
  });
