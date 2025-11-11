const ACCENT_REGEX = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC = /[^a-z0-9]/g;

export const stripAccents = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(ACCENT_REGEX, "");

export const normalizeKey = (value = "") =>
  stripAccents(String(value).toLowerCase()).replace(NON_ALPHANUMERIC, "");

export const normalizeText = (value = "") => stripAccents(String(value).trim().toLowerCase());

export const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  if (value === "") return [];
  return [value];
};

export const parseCurrency = (value, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  let text = String(value).trim();
  if (!text) return fallback;

  text = text.replace(/[R$\s]/gi, "");

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");

  if (hasComma && hasDot) {
    text = text.replace(/\./g, "").replace(/,/g, ".");
  } else if (hasComma) {
    text = text.replace(/,/g, ".");
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseInteger = (value, fallback = 0) => {
  const parsed = parseCurrency(value, fallback);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
};

export const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    // Excel serial date
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  const text = String(value).trim();
  if (!text) return null;

  const iso = new Date(text);
  if (!Number.isNaN(iso.getTime())) return iso.toISOString();

  const [day, month, rest] = text.split(/[/-]/);
  if (day && month && rest) {
    const year = rest.length === 2 ? `20${rest}` : rest;
    const parsed = new Date(`${year}-${month}-${day}`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return null;
};

const PROMOTORA_HINTS = [
  { name: "Nexxo", includes: ["nexxo", "nx"] },
  { name: "WorkBank", includes: ["workbank", "work bank", "work-bank", "wb"] },
  { name: "Yuppie", includes: ["yuppie"] },
  { name: "JD CRED VIP", includes: ["jdcred", "jd_cred", "jd cred"] }
];

export const detectPromotoraFromFilename = (filename = "") => {
  const lower = normalizeText(filename);
  for (const hint of PROMOTORA_HINTS) {
    if (hint.includes.some((token) => lower.includes(token))) {
      return hint.name;
    }
  }
  return null;
};

export const detectPromotoraFromValue = (value) => {
  const text = normalizeText(value);
  for (const hint of PROMOTORA_HINTS) {
    if (hint.includes.some((token) => text.includes(token))) {
      return hint.name;
    }
  }
  return value ? String(value).trim() : null;
};

export const summarizeColumns = (rows = [], limit = 80) => {
  const set = new Set();
  rows.forEach((row) => {
    if (row && typeof row === "object") {
      Object.keys(row).forEach((key) => set.add(String(key)));
    }
  });
  return Array.from(set).slice(0, limit);
};

export const safeFilename = (name = "arquivo") => {
  const base = stripAccents(String(name).replace(/\s+/g, "-"));
  return base.replace(/[^a-z0-9._-]/gi, "") || "arquivo";
};

