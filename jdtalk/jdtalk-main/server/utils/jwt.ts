import crypto from "crypto";

type SignOptions = {
  expiresInSeconds: number;
};

type JwtPayload = Record<string, unknown> & {
  exp: number;
  iat: number;
};

type VerifyResult<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  valid: boolean;
  payload?: TPayload & { exp: number; iat: number };
  error?: string;
};

const base64UrlEncode = (input: Buffer | string) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const base64UrlDecode = (input: string) => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64");
};

const sign = (data: string, secret: string) =>
  base64UrlEncode(crypto.createHmac("sha256", secret).update(data).digest());

export function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  options: SignOptions
): { token: string; expiresAt: number } {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const issuedAt = Math.floor(Date.now() / 1000);
  const exp = issuedAt + options.expiresInSeconds;
  const body: JwtPayload = {
    ...payload,
    iat: issuedAt,
    exp
  };

  const headerPart = base64UrlEncode(JSON.stringify(header));
  const payloadPart = base64UrlEncode(JSON.stringify(body));
  const unsigned = `${headerPart}.${payloadPart}`;
  const signature = sign(unsigned, secret);

  return {
    token: `${unsigned}.${signature}`,
    expiresAt: exp
  };
}

export function verifyJwt<TPayload extends Record<string, unknown> = Record<string, unknown>>(
  token: string,
  secret: string
): VerifyResult<TPayload> {
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
    const payload = JSON.parse(payloadJson) as TPayload & { exp: number; iat: number };

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: "Token expirado" };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}
