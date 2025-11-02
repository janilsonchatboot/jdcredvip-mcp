import type { SupabaseClient } from "@supabase/supabase-js";
import type OpenAI from "openai";
import { loadPromptCollections } from "./load-prompts.js";

export const EXTRATO_INSS_BUCKET = "extratos_inss";
const RESULTS_TABLE = "analise_extrato_inss";
const MAX_BASE64_LENGTH = 2_000_000;

const guides = loadPromptCollections();
const extratoGuide = guides.jdcredvip["jdcredvip.extrato"]?.content ?? "";

type NullableString = string | null;

type AnalysisRecord = {
  nome_cliente: NullableString;
  cpf: NullableString;
  banco: NullableString;
  contrato: NullableString;
  tipo_operacao: NullableString;
  data_inicio: NullableString;
  data_fim: NullableString;
  prazo_meses: number | null;
  valor_parcela: number | null;
  valor_liberado: number | null;
  valor_total: number | null;
  taxa_juros: number | null;
  margem_comprometida: number | null;
  margem_livre: number | null;
  situacao_atual: NullableString;
  recomendacao: string;
  justificativa: string;
  prioridade: number;
  status_analise: string;
  data_analise: string;
  analisado_por: string;
  arquivo_pdf_url: string | null;
  nome_arquivo: string;
  origem: string;
};

export type ExtratoInssPayload = {
  id: string;
  bucket: string;
  name: string;
  metadata?: Record<string, unknown>;
};

export type ExtratoHandlerContext = {
  supabase: SupabaseClient;
  openai: OpenAI;
  log: (message: string) => void;
  notify?: (title: string, data: unknown) => Promise<void>;
};

export async function handleExtratoINSSUpload(
  payload: ExtratoInssPayload,
  context: ExtratoHandlerContext,
): Promise<void> {
  const { bucket, name } = payload;
  if (!name) {
    context.log("[extrato-inss] Evento ignorado: objeto sem nome");
    return;
  }

  if (bucket !== EXTRATO_INSS_BUCKET) {
    context.log(
      `[extrato-inss] Upload ignorado (bucket ${bucket}) — aguardado: ${EXTRATO_INSS_BUCKET}`,
    );
    return;
  }

  context.log(`[extrato-inss] Novo PDF detectado: ${name}`);

  const download = await context.supabase.storage.from(bucket).download(name);
  if (download.error || !download.data) {
    context.log(
      `[extrato-inss] Falha ao baixar PDF: ${download.error?.message ?? "desconhecido"}`,
    );
    return;
  }

  const arrayBuffer = await download.data.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);

  const publicUrl = context.supabase.storage.from(bucket).getPublicUrl(name);
  const arquivoUrl = publicUrl.data?.publicUrl ?? null;

  const analysis = await analyzePdf(pdfBuffer, name, context);
  analysis.arquivo_pdf_url = arquivoUrl;
  analysis.nome_arquivo = name;

  const insert = await context.supabase.from(RESULTS_TABLE).insert(analysis);
  if (insert.error) {
    context.log(
      `[extrato-inss] Erro ao inserir análise: ${insert.error.message}`,
    );
    return;
  }

  context.log("[extrato-inss] Análise registrada com sucesso");

  if (context.notify) {
    await context.notify("Análise de extrato concluída", {
      arquivo: name,
      prioridade: analysis.prioridade,
      recomendacao: analysis.recomendacao,
      status: analysis.status_analise,
    });
  }
}

async function analyzePdf(
  pdfBuffer: Buffer,
  fileName: string,
  context: ExtratoHandlerContext,
): Promise<AnalysisRecord> {
  const baseRecord: AnalysisRecord = {
    nome_cliente: null,
    cpf: null,
    banco: null,
    contrato: null,
    tipo_operacao: null,
    data_inicio: null,
    data_fim: null,
    prazo_meses: null,
    valor_parcela: null,
    valor_liberado: null,
    valor_total: null,
    taxa_juros: null,
    margem_comprometida: null,
    margem_livre: null,
    situacao_atual: "pendente",
    recomendacao: "Revisar manualmente",
    justificativa: "Análise automática ainda não concluída",
    prioridade: 0,
    status_analise: "erro",
    data_analise: new Date().toISOString(),
    analisado_por: "Codex Agent",
    arquivo_pdf_url: null,
    nome_arquivo: fileName,
    origem: "upload_pdf",
  };

  if (!context.openai.apiKey) {
    context.log("[extrato-inss] OPENAI_API_KEY não configurada; retornando fallback");
    return baseRecord;
  }

  const base64Pdf = pdfBuffer.toString("base64");
  const truncated =
    base64Pdf.length > MAX_BASE64_LENGTH
      ? base64Pdf.slice(0, MAX_BASE64_LENGTH)
      : base64Pdf;

  const instructions = `Você é um analista financeiro da JD CRED VIP.
Seu trabalho é ler extratos consignados do Meu INSS e retornar um JSON com os campos:
{
  "nome_cliente": string | null,
  "cpf": string | null,
  "banco": string | null,
  "contrato": string | null,
  "tipo_operacao": string,
  "data_inicio": string | null (formato YYYY-MM-DD),
  "data_fim": string | null,
  "prazo_meses": number | null,
  "valor_parcela": number | null,
  "valor_liberado": number | null,
  "valor_total": number | null,
  "taxa_juros": number | null (percentual mensal),
  "margem_comprometida": number | null (%),
  "margem_livre": number | null (%),
  "situacao_atual": string,
  "recomendacao": string,
  "justificativa": string,
  "prioridade": number (0, 1 ou 2)
}
Use as regras a seguir como guia de negócio:
${extratoGuide}
Retorne somente JSON válido.`;

  try {
    const completion = await context.openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: instructions },
        {
          role: "user",
          content: `Arquivo: ${fileName}\nAmostra (base64, truncado=${
            base64Pdf.length > MAX_BASE64_LENGTH
          }):\n${truncated}`,
        },
      ],
    });

    const message = completion.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonResponse(message);
    if (!parsed) {
      context.log("[extrato-inss] Não foi possível interpretar resposta da IA");
      return baseRecord;
    }

    const record: AnalysisRecord = {
      ...baseRecord,
      ...mapParsedToRecord(parsed),
      status_analise: "concluído",
      data_analise: new Date().toISOString(),
      analisado_por: "Codex Agent",
    };

    return record;
  } catch (error: any) {
    context.log(`[extrato-inss] Erro durante chamada à OpenAI: ${error.message}`);
    return baseRecord;
  }
}

function parseJsonResponse(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (error) {
    return null;
  }
}

function mapParsedToRecord(
  parsed: Record<string, unknown>,
): Partial<AnalysisRecord> {
  const get = (key: string) => parsed[key];
  return {
    nome_cliente: toNullableString(get("nome_cliente")),
    cpf: toNullableString(get("cpf")),
    banco: toNullableString(get("banco")),
    contrato: toNullableString(get("contrato")),
    tipo_operacao: toNullableString(get("tipo_operacao")),
    data_inicio: toNullableString(get("data_inicio")),
    data_fim: toNullableString(get("data_fim")),
    prazo_meses: toNullableNumber(get("prazo_meses")),
    valor_parcela: toNullableNumber(get("valor_parcela")),
    valor_liberado: toNullableNumber(get("valor_liberado")),
    valor_total: toNullableNumber(get("valor_total")),
    taxa_juros: toNullableNumber(get("taxa_juros")),
    margem_comprometida: toNullableNumber(get("margem_comprometida")),
    margem_livre: toNullableNumber(get("margem_livre")),
    situacao_atual: toNullableString(get("situacao_atual")),
    recomendacao:
      toNullableString(get("recomendacao")) ?? "Revisar manualmente",
    justificativa:
      toNullableString(get("justificativa")) ??
      "Justificativa não fornecida pela análise automática.",
    prioridade: toNullableNumber(get("prioridade")) ?? 0,
  };
}

function toNullableString(value: unknown): NullableString {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value
      .replace(/[^0-9.,-]/g, "")
      .replace(/,/g, ".")
      .trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}
