export type SignJwtOptions = {
  expiresInSeconds: number;
};

export type VerifyResult<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  valid: boolean;
  payload?: TPayload & { exp: number; iat: number };
  error?: string;
};

export declare function signJwt<TPayload extends Record<string, unknown>>(
  payload: TPayload,
  secret: string,
  options: SignJwtOptions
): {
  token: string;
  expiresAt: number;
};

export declare function verifyJwt<TPayload extends Record<string, unknown> = Record<string, unknown>>(
  token: string,
  secret: string
): VerifyResult<TPayload>;

export declare function base64UrlEncode(input: Buffer | string): string;
export declare function base64UrlDecode(input: string): Buffer;

