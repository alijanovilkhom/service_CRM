import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "avatars");

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const ALLOWED_AVATAR_TYPES = new Set(Object.keys(MIME_TO_EXT));
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function saveAvatarFile(userId: string, file: File): Promise<string> {
  const mime = file.type || "image/jpeg";
  if (!ALLOWED_AVATAR_TYPES.has(mime)) {
    throw new Error("Нужен файл JPG, PNG, WEBP или GIF");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_AVATAR_BYTES) {
    throw new Error("Файл больше 2 МБ");
  }

  const ext = MIME_TO_EXT[mime] || "jpg";
  const filename = `${userId}-${Date.now()}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/api/avatars/${filename}`;
}

export function avatarFilePath(filename: string): string | null {
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return null;
  return path.join(UPLOAD_DIR, filename);
}

export async function readAvatarFile(filename: string): Promise<Buffer | null> {
  const filePath = avatarFilePath(filename);
  if (!filePath) return null;
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

export function mimeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

export async function deleteLocalAvatar(avatarUrl: string | null | undefined) {
  if (!avatarUrl?.startsWith("/api/avatars/")) return;
  const filename = avatarUrl.slice("/api/avatars/".length);
  const filePath = avatarFilePath(filename);
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch {
    // файла уже нет
  }
}
