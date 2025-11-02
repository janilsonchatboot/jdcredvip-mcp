#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const resolveProjectPath = (...segments) => path.join(projectRoot, ...segments);
const resolveExistingPath = (value) => {
  if (!value) return null;
  if (path.isAbsolute(value)) {
    return fs.existsSync(value) ? value : null;
  }

  const fromCwd = path.resolve(value);
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }

  const fromProject = resolveProjectPath(value);
  return fs.existsSync(fromProject) ? fromProject : null;
};

dotenv.config({ path: resolveProjectPath(".env") });

const configPathArg = process.argv[2];
const configPath = configPathArg ? resolveExistingPath(configPathArg) : resolveProjectPath("scripts", "data", "pending-posts.json");
const publishScript = resolveProjectPath("scripts", "publish-blogger.mjs");

if (!configPath || !fs.existsSync(configPath)) {
  const reference = configPathArg || configPath || "scripts/data/pending-posts.json";
  console.error(`Config nao encontrada: ${reference}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const posts = Array.isArray(config.posts) ? config.posts : [];

if (!posts.length) {
  console.log("Nenhum post para publicar.");
  process.exit(0);
}

for (const post of posts) {
  const articlePath = resolveProjectPath("articles", `${post.slug}.html`);
  const snapshotPath = resolveProjectPath("articles", `post-${post.id}.json`);

  if (!fs.existsSync(articlePath)) {
    console.error(`HTML nao encontrado para ${post.slug}: ${articlePath}`);
    process.exit(1);
  }

  const title = post.article?.title;
  if (!title) {
    console.error(`Titulo ausente no config para ${post.slug}`);
    process.exit(1);
  }

  const labels = fs.existsSync(snapshotPath)
    ? JSON.parse(fs.readFileSync(snapshotPath, "utf8")).labels || []
    : [];

  const args = [
    publishScript,
    `--title=${title}`,
    `--file=${articlePath}`,
    `--postId=${post.id}`
  ];

  if (labels.length) {
    args.push(`--labels=${labels.join(",")}`);
  }

  console.log(`Atualizando post ${post.id} (${post.slug})...`);
  const result = spawnSync("node", args, { stdio: "inherit" });

  if (result.status !== 0) {
    console.error(`Falha ao publicar post ${post.id}. Processo interrompido.`);
    process.exit(result.status || 1);
  }
}

console.log("Todos os posts foram atualizados com sucesso.");
