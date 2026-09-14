import type { SessionUser, User, UserRole } from "@/types/crm.types";

export function mapUserRow(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: (row.role === "admin" ? "admin" : "manager") as UserRole,
    is_active: Number(row.is_active) === 1,
    created_at: String(row.created_at),
    avatar_url: row.avatar_url == null || row.avatar_url === "" ? null : String(row.avatar_url),
  };
}

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    avatar_url: user.avatar_url,
  };
}

export const USER_PUBLIC_COLUMNS =
  "id, name, email, role, is_active, created_at, avatar_url";
