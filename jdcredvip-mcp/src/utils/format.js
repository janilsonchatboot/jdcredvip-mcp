const NUMBER_SANITIZER = /[^\d.,-]/g;
const DECIMAL_SEPARATOR = /,/g;
const THOUSANDS_SEPARATOR = /\./g;

export const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = String(value).trim();
  if (!text) return 0;

  const normalized = text
    .replace(THOUSANDS_SEPARATOR, "")
    .replace(DECIMAL_SEPARATOR, ".")
    .replace(NUMBER_SANITIZER, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const toCurrency = (value) => {
  const parsed = toNumber(value);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parseFloat(parsed.toFixed(2)));
};

export const toDigits = (value) => {
  if (value === null || value === undefined) return null;
  const digits = String(value).replace(/\D+/g, "");
  return digits || null;
};

export const toISODate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial
    const asDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!Number.isNaN(asDate.getTime())) {
      return asDate.toISOString().slice(0, 10);
    }
  }

  const text = String(value).trim();
  if (!text) return null;

  const isoCandidate = new Date(text);
  if (!Number.isNaN(isoCandidate.getTime())) {
    return isoCandidate.toISOString().slice(0, 10);
  }

  const match = text.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (match) {
    const [, dd, mm, yearRaw] = match;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw.padStart(4, "0");
    const normalized = `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return normalized;
    }
  }

  return null;
};

export const asDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    const iso = toISODate(value);
    if (iso) {
      const fromIso = new Date(iso);
      return Number.isNaN(fromIso.getTime()) ? null : fromIso;
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const asDate = new Date(value);
    if (!Number.isNaN(asDate.getTime())) return asDate;
  }
  return null;
};

export const cleanText = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
};
