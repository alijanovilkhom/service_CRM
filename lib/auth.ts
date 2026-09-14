import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { SESSION_DAYS } from "@/lib/constants";
import type { UserRole } from "@/types/crm.types";

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(password, passwordHash);
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  const userId = payload.userId;
  const role = payload.role;
  if (typeof userId !== "string" || (role !== "admin" && role !== "manager")) {
    throw new Error("Invalid token payload");
  }
  return { userId, role };
}
