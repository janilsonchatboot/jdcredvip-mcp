import type {
  SignJwtOptions as SharedSignOptions,
  VerifyResult as SharedVerifyResult
} from "../../../../shared/jwt/index.js";
import {
  signJwt as sharedSignJwt,
  verifyJwt as sharedVerifyJwt
} from "../../../../shared/jwt/index.js";

export type SignOptions = SharedSignOptions;
export type VerifyResult<TPayload extends Record<string, unknown> = Record<string, unknown>> =
  SharedVerifyResult<TPayload>;

export const signJwt = sharedSignJwt;
export const verifyJwt = sharedVerifyJwt;
