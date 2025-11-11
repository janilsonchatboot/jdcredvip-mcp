import crypto from "crypto";

const base64UrlEncode = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const base64UrlDecode = (input) => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64");
};

const sign = (data, secret) =>
  base64UrlEncode(crypto.createHmac("sha256", secret).update(data).digest());

export function verifyJwt(token, secret) {
  try {
    const [headerPart, payloadPart, signature] = token.split(".");
    if (!headerPart || !payloadPart || !signature) {
      return { valid: false, error: "Formato invalido" };
    }

    const unsigned = `${headerPart}.${payloadPart}`;
    const expectedSignature = sign(unsigned, secret);

    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (
      provided.length !== expected.length ||
      !crypto.timingSafeEqual(provided, expected)
    ) {
      return { valid: false, error: "Assinatura invalida" };
    }

    const payloadJson = base64UrlDecode(payloadPart).toString("utf-8");
    const payload = JSON.parse(payloadJson);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: "Token expirado" };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
