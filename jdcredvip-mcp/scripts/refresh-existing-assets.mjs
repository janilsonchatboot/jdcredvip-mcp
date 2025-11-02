#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildSvg } from "./generate-blog-assets.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const svgDir = path.join(projectRoot, "public", "blog");
const articleDir = path.join(projectRoot, "articles");

const paletteByButton = {
  "#1D4ED8": "blue",
  "#2563EB": "blue",
  "#0284C7": "teal",
  "#0EA5E9": "teal",
  "#0F9F6E": "green",
  "#10B981": "green",
  "#6D28D9": "purple",
  "#7C3AED": "purple",
  "#FB7A24": "amber",
  "#F97316": "amber"
};

function extractBetween(content, start, end) {
  const startIndex = content.indexOf(start);
  if (startIndex === -1) {
    return "";
  }

  const endIndex = content.indexOf(end, startIndex + start.length);
  if (endIndex === -1) {
    return "";
  }

  return content.slice(startIndex + start.length, endIndex).trim();
}

function regenerateFromSvg(svgPath) {
  const svgContent = fs.readFileSync(svgPath, "utf8");
  const slug = path.basename(svgPath, ".svg");

  const headerBlock = extractBetween(svgContent, '<g transform="translate(120 160)">', "</g>");
  const headerMatches = [...headerBlock.matchAll(/<text[^>]*>\s*([\s\S]*?)\s*<\/text>/g)];
  if (headerMatches.length < 3) {
    throw new Error(`Nao foi possivel ler textos principais do SVG ${slug}`);
  }

  const topLabel = headerMatches[0][1].trim();
  const headline = headerMatches[1][1].trim();
  const subheading = headerMatches[2][1].trim();

  const buttonBlock = extractBetween(svgContent, '<g transform="translate(160 300)">', "</g>");
  const buttonRectMatch = buttonBlock.match(/<rect[^>]*fill="([^"]+)"/);
  if (!buttonRectMatch) {
    throw new Error(`Nao foi possivel identificar a cor do botao em ${slug}`);
  }
  const paletteName = paletteByButton[buttonRectMatch[1]] || "blue";

  const buttonLines = [...buttonBlock.matchAll(/<tspan[^>]*>(.*?)<\/tspan>/g)].map((match) =>
    match[1].trim()
  );

  const svg = buildSvg({ topLabel, headline, subheading, buttonLines, paletteName });
  fs.writeFileSync(svgPath, svg, "utf8");

  const articlePath = path.join(articleDir, `${slug}.html`);
  if (fs.existsSync(articlePath)) {
    const html = fs.readFileSync(articlePath, "utf8");
    const heroBase64 = Buffer.from(svg, "utf8").toString("base64");
    const updated = html.replace(
      /data:image\/svg\+xml;base64,[^"]+/,
      `data:image/svg+xml;base64,${heroBase64}`
    );
    fs.writeFileSync(articlePath, updated, "utf8");
  }
}

const svgFiles = fs.readdirSync(svgDir).filter((file) => file.endsWith(".svg"));

for (const file of svgFiles) {
  regenerateFromSvg(path.join(svgDir, file));
}
