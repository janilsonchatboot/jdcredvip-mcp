export type EventType = "INSERT" | "UPDATE" | "DELETE";
export type TableName =
  | "fgts_saque_aniversario"
  | "inss"
  | "follow_ups"
  | "carteira_triagem_historico"
  | string;

export interface RouteContext {
  notify: (title: string, data: unknown) => Promise<void>;
  summarize: (table: string, event: EventType, record: any) => Promise<string>;
  log: (msg: string) => void;
}

export async function handleEvent(
  table: TableName,
  event: EventType,
  record: any,
  ctx: RouteContext
) {
  switch (table) {
    case "fgts_saque_aniversario":
      if (event === "INSERT") {
        ctx.log(`Novo FGTS: ${record.nome_do_cliente} (${record.cpf})`);
        const resumo = await ctx.summarize(table, event, record);
        await ctx.notify("Lead FGTS criado", { record, resumo });
      }
      break;

    case "inss":
      if (event === "UPDATE") {
        ctx.log(
          `INSS atualizado: ${record.nome_do_cliente} → ${record.situacao}`
        );
        const resumo = await ctx.summarize(table, event, record);
        await ctx.notify("INSS atualizado", { record, resumo });
      }
      break;

    case "follow_ups":
      if (event === "UPDATE") {
        ctx.log(
          `Follow-up ${record.nome_do_cliente} → próximo: ${record.proximo_contato}`
        );
        const resumo = await ctx.summarize(table, event, record);
        await ctx.notify("Follow-up atualizado", { record, resumo });
      }
      break;

    case "carteira_triagem_historico":
      if (event === "INSERT") {
        ctx.log(
          `Triagem: ${record.nome_do_cliente} → ${record.produto_recomendado}`
        );
        const resumo = await ctx.summarize(table, event, record);
        await ctx.notify("Triagem registrada", { record, resumo });
      }
      break;

    default:
      ctx.log(`(sem handler) ${table} ${event}`);
  }
}
