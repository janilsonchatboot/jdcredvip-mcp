#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const articleDir = path.join(projectRoot, "articles");
const outputPathArg = process.argv[2];
const outputPath = outputPathArg
  ? path.isAbsolute(outputPathArg)
    ? outputPathArg
    : path.join(projectRoot, outputPathArg)
  : path.join(projectRoot, "scripts", "data", "publish-queue.json");

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function loadHtmlEntries() {
  const entries = [];
  const files = fs.readdirSync(articleDir).filter((file) => file.endsWith(".html"));

  for (const file of files) {
    const fullPath = path.join(articleDir, file);
    const content = fs.readFileSync(fullPath, "utf8");
    const titleMatch = content.match(/<h2>(.*?)<\/h2>/);
    if (!titleMatch) {
      continue;
    }

    const title = titleMatch[1].trim();
    entries.push({
      slug: file.replace(/\.html$/, ""),
      title,
      norm: normalizeText(title),
      tokens: tokenize(title)
    });
  }

  return entries;
}

function buildConfig() {
  const htmlEntries = loadHtmlEntries();
  const posts = [];

  const snapshotFiles = fs
    .readdirSync(articleDir)
    .filter((file) => file.startsWith("post-") && file.endsWith(".json"));

  for (const snapshot of snapshotFiles) {
    const snapshotPath = path.join(articleDir, snapshot);
    const data = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    const normTitle = normalizeText(data.title);
    const titleTokens = tokenize(data.title);

    const matchIndex = htmlEntries.findIndex(
      (entry) =>
        entry.norm === normTitle ||
        entry.norm.includes(normTitle) ||
        normTitle.includes(entry.norm)
    );

    let entry;
    if (matchIndex !== -1) {
      entry = htmlEntries.splice(matchIndex, 1)[0];
    } else {
      let bestScore = 0;
      let bestIndex = -1;
      for (let i = 0; i < htmlEntries.length; i += 1) {
        const entryTokens = htmlEntries[i].tokens;
        const intersection = titleTokens.filter((token) => entryTokens.includes(token));
        if (intersection.length > bestScore) {
          bestScore = intersection.length;
          bestIndex = i;
        }
      }

      if (bestIndex !== -1 && bestScore >= 3) {
        entry = htmlEntries.splice(bestIndex, 1)[0];
      }
    }

    if (!entry) {
      console.warn(
        `Aviso: nenhuma correspondencia encontrada para o titulo "${data.title}" (ID ${data.id})`
      );
      continue;
    }

    posts.push({
      id: data.id,
      slug: entry.slug,
      article: {
        title: entry.title
      }
    });
  }

  return { posts };
}

const config = buildConfig();
fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), "utf8");
console.log(`Arquivo gerado em ${outputPath} com ${config.posts.length} post(s).`);
