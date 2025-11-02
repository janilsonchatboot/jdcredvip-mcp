#!/usr/bin/env node
// === JD CRED VIP - Publicador Blogger ===
import fs from "fs";
import path from "path";
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
const resolveOutputPath = (value) => (path.isAbsolute(value) ? value : resolveProjectPath(value));

dotenv.config({ path: resolveProjectPath(".env") });

const {
  BLOGGER_CLIENT_ID,
  BLOGGER_CLIENT_SECRET,
  BLOGGER_REFRESH_TOKEN,
  BLOGGER_BLOG_ID
} = process.env;

const requiredEnv = {
  BLOGGER_CLIENT_ID,
  BLOGGER_CLIENT_SECRET,
  BLOGGER_REFRESH_TOKEN,
  BLOGGER_BLOG_ID
};

const missing = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length) {
  console.error(`Erro: variaveis ausentes -> ${missing.join(", ")}`);
  process.exit(1);
}

const args = process.argv.slice(2);

const params = args.reduce((acc, arg) => {
  if (!arg.startsWith("--")) {
    return acc;
  }

  const trimmed = arg.replace(/^--/, "");
  const [key, value] = trimmed.split("=");

  if (key && value !== undefined) {
    acc[key] = value;
  } else if (key) {
    acc[key] = true;
  }

  return acc;
}, {});

const title = params.title || params.t;
const filePath = params.file || params.f;
const labels = params.labels ? params.labels.split(",").map((label) => label.trim()) : [];
const postId = params.postId || params.id || "";
const searchQuery = params.search || params.q || "";
const getId = params.get || params.download || "";
const outputPath = params.out || params.output || params.o || "";
const maxResults = Number(params.max || params.maxResults || 10);
const listFlag = Object.prototype.hasOwnProperty.call(params, "list");
const mode = searchQuery
  ? "search"
  : getId
    ? "get"
    : listFlag
      ? "list"
      : "publish";

let content = params.content || params.c || "";

if (mode === "publish") {
  if (!title) {
    console.error("Uso: node scripts/publish-blogger.mjs --title=\"Titulo\" --file=./conteudo.html [--labels=tag1,tag2] [--postId=ID]");
    process.exit(1);
  }

  if (filePath) {
    const resolved = resolveExistingPath(filePath);
    if (!resolved) {
      console.error(`Erro: arquivo nao encontrado -> ${filePath}`);
      process.exit(1);
    }
    content = fs.readFileSync(resolved, "utf8");
  }

  if (!content) {
    console.error("Erro: informe o conteudo via --file ou --content.");
    process.exit(1);
  }
}

async function fetchAccessToken() {
  const body = new URLSearchParams({
    client_id: BLOGGER_CLIENT_ID,
    client_secret: BLOGGER_CLIENT_SECRET,
    refresh_token: BLOGGER_REFRESH_TOKEN,
    grant_type: "refresh_token"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao obter access_token: ${response.status} ${error}`);
  }

  const json = await response.json();
  if (!json.access_token) {
    throw new Error("Response nao contem access_token.");
  }

  return json.access_token;
}

async function publishPost(accessToken) {
  const body = {
    kind: "blogger#post",
    title,
    content,
    labels
  };

  const baseUrl = `https://www.googleapis.com/blogger/v3/blogs/${BLOGGER_BLOG_ID}/posts`;
  const endpoint = postId ? `${baseUrl}/${postId}` : `${baseUrl}/`;
  const method = postId ? "PATCH" : "POST";

  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao publicar: ${response.status} ${error}`);
  }

  return response.json();
}

async function listPosts(accessToken, max = 10) {
  const url = `https://www.googleapis.com/blogger/v3/blogs/${BLOGGER_BLOG_ID}/posts?maxResults=${max}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao listar posts: ${response.status} ${error}`);
  }

  return response.json();
}

async function searchPosts(accessToken, query) {
  const url = `https://www.googleapis.com/blogger/v3/blogs/${BLOGGER_BLOG_ID}/posts/search?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao buscar posts: ${response.status} ${error}`);
  }

  return response.json();
}

async function getPost(accessToken, id) {
  if (!id) {
    throw new Error("Informe o ID do post com --get=POST_ID");
  }

  const url = `https://www.googleapis.com/blogger/v3/blogs/${BLOGGER_BLOG_ID}/posts/${id}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao obter post: ${response.status} ${error}`);
  }

  return response.json();
}

async function main() {
  try {
    console.log("Obtendo access_token...");
    const accessToken = await fetchAccessToken();
    if (mode === "list") {
      const data = await listPosts(accessToken, maxResults);
      (data.items || []).forEach((item) => {
        console.log(`${item.id} | ${item.title} | ${item.url}`);
      });
      if (!data.items?.length) {
        console.log("Nenhum post encontrado.");
      }
      return;
    }

    if (mode === "search") {
      const data = await searchPosts(accessToken, searchQuery);
      (data.items || []).forEach((item) => {
        console.log(`${item.id} | ${item.title} | ${item.url}`);
      });
      if (!data.items?.length) {
        console.log("Nenhum post encontrado para a busca.");
      }
      return;
    }

    if (mode === "get") {
      const post = await getPost(accessToken, getId);
      if (outputPath) {
        const resolvedOutput = resolveOutputPath(outputPath);
        fs.writeFileSync(resolvedOutput, JSON.stringify(post, null, 2), "utf8");
        console.log(`Post salvo em ${resolvedOutput}`);
      } else {
        console.log(JSON.stringify(post, null, 2));
      }
      return;
    }

    console.log(postId ? `Atualizando post ${postId}...` : "Publicando post no Blogger...");
    const result = await publishPost(accessToken);
    console.log(`Post ${postId ? "atualizado" : "publicado"} com sucesso! URL: ${result.url}`);
  } catch (error) {
    console.error("Erro ao publicar no Blogger:");
    console.error(error.message);
    process.exit(1);
  }
}

main();
