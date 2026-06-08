import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

export type AuthUser = {
  id: string;
  nome: string;
  telefone: string;
};

export const SESSION_COOKIE = "bolao_session";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const HASH_KEY_LENGTH = 64;

function getSessionSecret() {
  return process.env.AUTH_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "bolao-dev-secret";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, HASH_KEY_LENGTH).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split(":");

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const candidate = scryptSync(password, salt, HASH_KEY_LENGTH);
  const original = Buffer.from(hash, "hex");

  return original.length === candidate.length && timingSafeEqual(original, candidate);
}

export function createSessionToken(user: AuthUser) {
  const payload = base64UrlEncode(
    JSON.stringify({
      ...user,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
    })
  );

  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token?: string): AuthUser | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    const session = JSON.parse(base64UrlDecode(payload)) as AuthUser & { exp: number };

    if (!session.id || !session.nome || !session.telefone || session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: session.id,
      nome: session.nome,
      telefone: session.telefone
    };
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  return readSessionToken(cookies().get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS
};
