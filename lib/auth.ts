import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { Role, Status, User } from "@prisma/client";

const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION = "7d";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const secretKey = new TextEncoder().encode(env.JWT_SECRET);

const BCRYPT_SALT_ROUNDS = 10;

export type SessionTokenPayload = {
  userId: string;
};

/** A user's fields safe to send to the client — never includes `password`. */
export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: Status;
  locale: string;
  createdAt: Date;
};

/** The current session is just the current user's public fields. */
export type Session = PublicUser;

/** Prisma `select` matching `PublicUser`, for queries that don't need `password` at all. */
export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  locale: true,
  createdAt: true,
} as const;

/** Strips `password` from a full `User` row already fetched for another reason (e.g. login,
 * which needs the hash to verify against). */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    locale: user.locale,
    createdAt: user.createdAt,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: SessionTokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionTokenPayload>(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (typeof payload.userId !== "string") {
      return null;
    }

    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export type RequireAdminResult =
  | { ok: true; session: Session }
  | { ok: false; status: 401 | 403; message: string };

/**
 * Every `/api/admin/*` handler calls this itself (CLAUDE.md §8.1: "Every handler re-checks
 * `role === 'ADMIN'` — never rely on the layout guard alone") — the `(admin)` layout's own
 * check only protects the UI route, not these API routes, which a client could hit directly.
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const session = await getSession();
  if (!session) return { ok: false, status: 401, message: "Not authenticated" };
  if (session.role !== "ADMIN") return { ok: false, status: 403, message: "Forbidden" };
  return { ok: true, session };
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: publicUserSelect,
  });

  return user;
}
