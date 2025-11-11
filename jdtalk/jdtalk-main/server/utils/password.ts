import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export const PASSWORD_HASH_PREFIX = "scrypt-v1";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${PASSWORD_HASH_PREFIX}$${salt}$${derivedKey}`;
}

type PasswordVerification = {
  valid: boolean;
  needsRehash: boolean;
};

export function verifyPassword(stored: string, candidate: string): PasswordVerification {
  if (!stored) {
    return { valid: false, needsRehash: false };
  }

  if (stored.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    const [, salt, hash] = stored.split("$");

    if (!salt || !hash) {
      return { valid: false, needsRehash: true };
    }

    const candidateHash = scryptSync(candidate, salt, 64);
    const storedBuffer = Buffer.from(hash, "hex");
    const candidateBuffer = Buffer.from(candidateHash);

    if (storedBuffer.length !== candidateBuffer.length) {
      return { valid: false, needsRehash: true };
    }

    const valid = timingSafeEqual(storedBuffer, candidateBuffer);
    return { valid, needsRehash: false };
  }

  // senha legado em texto puro
  return { valid: stored === candidate, needsRehash: stored === candidate };
}
