import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { handleEvent, type EventType } from "./router.js";
import { loadPromptCollections } from "./load-prompts.js";
import {
  EXTRATO_INSS_BUCKET,
  handleExtratoINSSUpload,
} from "./extrato-inss.handler.js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const REALTIME_CHANNEL = process.env.REALTIME_CHANNEL || "jdcredvip";
const AGENT_LOG_FILE = process.env.AGENT_LOG_FILE || ".logsrealtime.log";
const AGENT_TABLES = (process.env.AGENT_TABLES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const JDTALK_API_URL = process.env.JDTALK_API_URL;
const JDTALK_API_TOKEN = process.env.JDTALK_API_TOKEN;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltando SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { params: { eventsPerSecond: 5 } },
});

function ensureLogDir() {
  const dir = path.dirname(AGENT_LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureLogDir();

function log(line: string) {
  const msg = `[${new Date().toISOString()}] ${line}\n`;
  fs.appendFileSync(AGENT_LOG_FILE, msg);
  console.log(line);
}

const guides = loadPromptCollections();
const realtimeGuide = guides.supabase["supabase.realtime.ai-assistant"]?.content;
if (realtimeGuide) {
  console.log(
    "Guia Realtime carregado:",
    `${realtimeGuide.substring(0, 120)}...`,
  );
}

async function notify(title: string, data: unknown) {
  if (!JDTALK_API_URL || !JDTALK_API_TOKEN) return;
  try {
    const res = await fetch(`${JDTALK_API_URL}/api/agent/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JDTALK_API_TOKEN}`,
      },
      body: JSON.stringify({ title, data }),
    });
    if (!res.ok) {
      log(`notify falhou: ${res.status} ${await res.text()}`);
    }
  } catch (error: any) {
    log(`notify erro: ${error.message}`);
  }
}

async function summarize(table: string, event: string, record: any) {
  try {
    const content =
      `Resuma em 1-2 linhas a relevância comercial deste evento.\n` +
      `Tabela: ${table}\nEvento: ${event}\nDados: ${JSON.stringify(record, null, 2)}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Você é o assistente Codex JD CRED VIP. Seja objetivo, claro e útil.",
        },
        { role: "user", content },
      ],
    });
    return completion.choices[0].message.content?.trim() || "";
  } catch (error: any) {
    log(`summarize erro: ${error.message}`);
    return "";
  }
}

async function start() {
  log("Codex Realtime Agent iniciado");

  const realtimeChannel = supabase.channel(`realtime:${REALTIME_CHANNEL}`, {
    config: { broadcast: { ack: true }, presence: { key: "agent" } },
  });

  if (AGENT_TABLES.length) {
    for (const table of AGENT_TABLES) {
      realtimeChannel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        async (payload: any) => {
          const evt = (payload.eventType || payload.type) as EventType;
          log(`[db] ${table} ${evt}`);
          await handleEvent(table, evt, payload.new ?? payload.record, {
            notify,
            summarize,
            log,
          });
        },
      );
    }
  } else {
    realtimeChannel.on(
      "postgres_changes",
      { event: "*", schema: "public" },
      async (payload: any) => {
        const table = payload.table as string;
        const evt = (payload.eventType || payload.type) as EventType;
        log(`[db] ${table} ${evt}`);
        await handleEvent(table, evt, payload.new ?? payload.record, {
          notify,
          summarize,
          log,
        });
      },
    );
  }

  const storageChannel = supabase.channel(`storage:${EXTRATO_INSS_BUCKET}`, {
    config: { broadcast: { ack: true } },
  });

  storageChannel.on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "storage",
      table: "objects",
      filter: `bucket_id=eq.${EXTRATO_INSS_BUCKET}`,
    },
    async (payload: any) => {
      const bucket = (payload.new?.bucket_id ?? "") as string;
      const objectName =
        (payload.new?.name as string | undefined) ??
        (payload.new?.path as string | undefined) ??
        "";

      log(`[storage] upload detectado: bucket=${bucket} objeto=${objectName}`);

      await handleExtratoINSSUpload(
        {
          id: (payload.new?.id as string) ?? objectName,
          bucket,
          name: objectName,
          metadata: payload.new?.metadata ?? undefined,
        },
        {
          supabase,
          openai,
          log,
          notify,
        },
      );
    },
  );

  await Promise.all([
    realtimeChannel.subscribe((status) => {
      log(`[db] status: ${status}`);
    }),
    storageChannel.subscribe((status) => {
      log(`[storage] status: ${status}`);
    }),
  ]);

  process.on("SIGINT", async () => {
    log("Encerrando agente.");
    await supabase.removeChannel(realtimeChannel);
    await supabase.removeChannel(storageChannel);
    process.exit(0);
  });
}

start().catch((error) => {
  log(`Falha ao iniciar: ${error.message}`);
  process.exit(1);
});
