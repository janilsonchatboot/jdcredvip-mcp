#!/usr/bin/env node
// === JD CRED VIP - Gerador de artes e artigos padrao ===
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const resolveProjectPath = (...segments) => path.join(projectRoot, ...segments);
const resolveExistingPath = (value) => {
  if (!value) return null;
  if (path.isAbsolute(value)) return fs.existsSync(value) ? value : null;

  const fromCwd = path.resolve(value);
  if (fs.existsSync(fromCwd)) return fromCwd;

  const fromProject = resolveProjectPath(value);
  return fs.existsSync(fromProject) ? fromProject : null;
};

export const palettes = {
  blue: {
    bgStart: "#E3ECFF",
    bgEnd: "#C7D2FE",
    cardStart: "#FFFFFF",
    cardEnd: "#EEF2FF",
    accent: "#DBEAFE",
    accentLight: "#E8EDFF",
    figurePrimary: "#2563EB",
    figureSecondary: "#60A5FA",
    badge: "#FACC15",
    button: "#1D4ED8",
    foreground: "#1E3A8A"
  },
  teal: {
    bgStart: "#DAF6FF",
    bgEnd: "#BAE6FD",
    cardStart: "#FFFFFF",
    cardEnd: "#E0F7FF",
    accent: "#CFFAFE",
    accentLight: "#E6FBFF",
    figurePrimary: "#0EA5E9",
    figureSecondary: "#38BDF8",
    badge: "#FDE68A",
    button: "#0284C7",
    foreground: "#0F4C81"
  },
  green: {
    bgStart: "#E2FBE6",
    bgEnd: "#C8F5D7",
    cardStart: "#FFFFFF",
    cardEnd: "#E8FDF0",
    accent: "#DCFCE7",
    accentLight: "#E9FFF0",
    figurePrimary: "#10B981",
    figureSecondary: "#34D399",
    badge: "#FCD34D",
    button: "#0F9F6E",
    foreground: "#065F46"
  },
  purple: {
    bgStart: "#F0EAFF",
    bgEnd: "#E4D9FF",
    cardStart: "#FFFFFF",
    cardEnd: "#F3E8FF",
    accent: "#EDE9FE",
    accentLight: "#F6F1FF",
    figurePrimary: "#7C3AED",
    figureSecondary: "#A855F7",
    badge: "#FACC15",
    button: "#6D28D9",
    foreground: "#312E81"
  },
  amber: {
    bgStart: "#FFF1DB",
    bgEnd: "#FED7AA",
    cardStart: "#FFFFFF",
    cardEnd: "#FFF0DE",
    accent: "#FFE8CC",
    accentLight: "#FFF5E7",
    figurePrimary: "#EA580C",
    figureSecondary: "#FB923C",
    badge: "#FCD34D",
    button: "#FB7A24",
    foreground: "#78350F"
  }
};

export const buildSvg = ({ topLabel, headline, subheading, buttonLines, paletteName }) => {
  const palette = palettes[paletteName] ?? palettes.blue;

  const longestButtonLine = buttonLines.reduce((acc, line) => Math.max(acc, line.length), 0);
  const buttonWidth = Math.max(380, Math.ceil(longestButtonLine * 11));
  const buttonHeight = Math.max(110, 40 + buttonLines.length * 26);
  const textX = buttonWidth / 2;

  const buttonTspans = buttonLines
    .map((line, index) => `<tspan x="${textX}" y="${46 + index * 24}">${line}</tspan>`)
    .join("\n      ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="540" viewBox="0 0 960 540" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bgStart}"/>
      <stop offset="100%" stop-color="${palette.bgEnd}"/>
    </linearGradient>
    <linearGradient id="card" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.cardStart}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${palette.cardEnd}" stop-opacity="0.9"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="${palette.bgStart}" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="960" height="540" fill="url(#bg)"/>
  <g transform="translate(80 100)" filter="url(#shadow)">
    <rect width="800" height="340" rx="32" fill="url(#card)"/>
  </g>
  <g transform="translate(120 160)">
    <text font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="600" fill="${palette.foreground}">
      ${topLabel}
    </text>
    <text font-family="Segoe UI, Arial, sans-serif" font-size="46" font-weight="700" fill="${palette.foreground}" y="68">
      ${headline}
    </text>
    <text font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="${palette.foreground}" y="116">
      ${subheading}
    </text>
  </g>
  <g transform="translate(620 210)">
    <rect x="-40" y="-70" width="240" height="210" rx="32" fill="${palette.accentLight}" opacity="0.95"/>
    <rect x="-10" y="-20" width="58" height="140" rx="18" fill="${palette.figureSecondary}"/>
    <rect x="70" y="-40" width="66" height="160" rx="22" fill="${palette.figurePrimary}"/>
    <rect x="150" y="-5" width="48" height="110" rx="16" fill="${palette.accent}" opacity="0.9"/>
    <circle cx="152" cy="-60" r="32" fill="${palette.figurePrimary}" opacity="0.85"/>
    <circle cx="96" cy="-72" r="26" fill="${palette.figureSecondary}" opacity="0.6"/>
    <circle cx="190" cy="66" r="36" fill="${palette.badge}"/>
    <path d="M-24 32 h48 a8 8 0 0 1 0 16 h-48 a8 8 0 0 1 0-16 z" fill="${palette.button}" opacity="0.35"/>
  </g>
  <g transform="translate(160 300)">
    <rect width="${buttonWidth}" height="${buttonHeight}" rx="26" fill="${palette.button}"/>
    <text font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#F8FAFC" font-weight="600" text-anchor="middle">
      ${buttonTspans}
    </text>
  </g>
  <text font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#1F2937" x="80" y="500">
    JD CRED VIP - Consultoria financeira personalizada
  </text>
</svg>`;
};

export const buildArticle = ({ title, heroBase64, intro, sections, closing }) => {
  const introHtml = intro.map((paragraph) => `<p>${paragraph}</p>`).join("\n");

  const sectionHtml = sections
    .map((section) => {
      let body = "";
      if (section.list) {
        const tag = section.listType === "ol" ? "ol" : "ul";
        const items = section.list.map((item) => `<li>${item}</li>`).join("\n");
        body = `<${tag}>\n  ${items}\n</${tag}>`;
      } else if (section.paragraphs) {
        body = section.paragraphs.map((p) => `<p>${p}</p>`).join("\n");
      }

      return `<h3>${section.heading}</h3>\n${body}`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
  <body>
    <h2>${title}</h2>
    <p><img src="data:image/svg+xml;base64,${heroBase64}" alt="${title}" style="float:left; margin:0 24px 20px 0; width:320px; max-width:100%; height:auto;" /></p>
${introHtml}
${sectionHtml}
    <p><strong>${closing}</strong></p>
  </body>
</html>`;
};

export function generateAssets(configPath) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  for (const post of config.posts) {
    const svg = buildSvg(post.image);
    const svgPath = resolveProjectPath("public", "blog", `${post.slug}.svg`);
    fs.writeFileSync(svgPath, svg, "utf8");

    const heroBase64 = Buffer.from(svg, "utf8").toString("base64");
    const articleHtml = buildArticle({
      title: post.article.title,
      heroBase64,
      intro: post.article.intro,
      sections: post.article.sections,
      closing: post.article.closing
    });

    const articlePath = resolveProjectPath("articles", `${post.slug}.html`);
    fs.writeFileSync(articlePath, articleHtml, "utf8");
  }
}

function runCli() {
  const configArg = process.argv[2];
  const configPath = resolveExistingPath(configArg);

  if (!configPath) {
    console.error("Uso: node scripts/generate-blog-assets.mjs ./scripts/data/posts.json");
    process.exit(1);
  }

  generateAssets(configPath);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runCli();
}
