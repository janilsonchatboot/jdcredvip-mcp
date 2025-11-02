#!/usr/bin/env node
// === JD CRED VIP - Extracao e normalizacao de planilhas ===
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const resolveExistingPath = (value) => {
  if (!value) return null;
  if (path.isAbsolute(value)) {
    return fs.existsSync(value) ? value : null;
  }

  const fromCwd = path.resolve(value);
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }

  const fromProject = path.join(projectRoot, value);
  return fs.existsSync(fromProject) ? fromProject : null;
};
const resolveOutputDir = (value) =>
  value ? (path.isAbsolute(value) ? value : path.join(projectRoot, value)) : path.join(projectRoot, "data");

const inputArg = process.argv[2];
const outputArg = process.argv[3];
const resolvedInput = resolveExistingPath(inputArg);

if (inputArg && !resolvedInput) {
  console.error(`Erro: planilha nao encontrada -> ${inputArg}`);
  process.exit(1);
}

const INPUT_FILE = resolvedInput ?? path.join(projectRoot, "JD_CRED_VIP_Planilha_3.02.xlsx"); // ajuste se o nome for diferente
const OUTPUT_DIR = resolveOutputDir(outputArg);

const SKIP_SHEETS_REGEX = new RegExp(
  [
    "painel",
    "resumo",
    "dashboard",
    "par[aâ]metros",
    "parametros",
    "importar",
    "importar\\s+aqui",
    "config",
    "^aba$",
    "exemplo"
  ].join("|"),
  "i"
);

const SHEET_ALIASES = [
  { match: /fgts.*(saque).*aniversario/i, slug: "fgts_saque_aniversario" },
  { match: /^inss(\b|_|-)/i, slug: "inss" },
  { match: /(clt|trabalhador)/i, slug: "clt_trabalhador" },
  { match: /(bolsa).*familia/i, slug: "bolsa_familia" },
  { match: /(conta).*luz/i, slug: "conta_luz" },
  { match: /(credito).*pessoal/i, slug: "credito_pessoal" },
  { match: /follow[-_ ]?ups?/i, slug: "follow_ups" }
];

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const toSnake = (value) =>
  normalize(value)
    .replace(/[^\w]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

const headerToSnake = (header) =>
  toSnake(header).replace(/^(\d)/, "_$1");

const sheetSlug = (sheetName) => {
  const normalized = normalize(sheetName);
  for (const { match, slug } of SHEET_ALIASES) {
    if (match.test(normalized)) {
      return slug;
    }
  }

  return toSnake(sheetName) || "sheet";
};

const shouldSkip = (sheetName) => SKIP_SHEETS_REGEX.test(sheetName);

const csvEscape = (value) => {
  const str = String(value ?? "");
  if (str === "") return '""';
  return `"${str.replace(/"/g, '""')}"`;
};

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`Erro: planilha nao encontrada: ${INPUT_FILE}`);
  process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log(`Lendo planilha: ${path.basename(INPUT_FILE)}`);
const workbook = XLSX.readFile(INPUT_FILE);
const sheetNames = workbook.SheetNames;

const outputs = [];
const usedSlugs = new Map();

for (const sheetName of sheetNames) {
  if (shouldSkip(sheetName)) {
    console.log(`Ignorando aba de apoio: ${sheetName}`);
    continue;
  }

  console.log(`Processando aba: ${sheetName}`);
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  if (rows.length === 0) {
    console.log(`Aba vazia: ${sheetName} — pulando.`);
    continue;
  }

  const originalHeaders = Object.keys(rows[0]);
  const normalizedHeaders = originalHeaders.map(headerToSnake);

  const seen = new Map();
  for (let i = 0; i < normalizedHeaders.length; i += 1) {
    const header = normalizedHeaders[i];
    const count = (seen.get(header) || 0) + 1;
    seen.set(header, count);
    if (count > 1) {
      normalizedHeaders[i] = `${header}_${count}`;
    }
  }

  const normalizedRows = rows.map((row) => {
    const out = {};
    originalHeaders.forEach((original, index) => {
      out[normalizedHeaders[index]] = row[original];
    });
    return out;
  });

  const headerLine = normalizedHeaders.join(",");
  const bodyLines = normalizedRows.map((row) =>
    normalizedHeaders.map((header) => csvEscape(row[header])).join(",")
  );

  const csvContent = [headerLine, ...bodyLines].join("\n");
  let slug = sheetSlug(sheetName);
  if (usedSlugs.has(slug)) {
    const count = usedSlugs.get(slug) + 1;
    usedSlugs.set(slug, count);
    slug = `${slug}_${count}`;
  } else {
    usedSlugs.set(slug, 0);
  }
  const outputFile = path.join(OUTPUT_DIR, `JD_CRED_VIP_${slug}.csv`);

  fs.writeFileSync(outputFile, csvContent, "utf8");
  outputs.push({ sheet: sheetName, file: outputFile });
  console.log(`Salvo: ${path.basename(outputFile)}`);
}

console.log("\nExportacao concluida!");
if (outputs.length) {
  console.log("Arquivos gerados:");
  outputs.forEach(({ sheet, file }) => {
    console.log(` - ${sheet} -> ${path.basename(file)}`);
  });
} else {
  console.log("Nenhum CSV gerado (todas as abas eram de apoio ou vazias).");
}
