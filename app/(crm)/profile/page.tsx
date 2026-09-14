"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Link2, Trash2 } from "lucide-react";
import { useSession } from "@/components/layout/SessionContext";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/ToastProvider";
import { api } from "@/lib/client";
import type { SessionUser } from "@/types/crm.types";

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useSession();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function applyUser(next: SessionUser) {
    setUser(next);
    setName(next.name);
    setEmail(next.email);
    setAvatarUrl(next.avatar_url ?? "");
    router.refresh();
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name, email };
      const trimmedUrl = avatarUrl.trim();
      if (trimmedUrl !== (user.avatar_url ?? "")) {
        payload.avatar_url = trimmedUrl || null;
      }
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      const data = await api<{ user: SessionUser }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      applyUser(data.user);
      setCurrentPassword("");
      setNewPassword("");
      toast("Профиль сохранён");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Ошибка", "error");
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as {
        user?: SessionUser;
        error?: string;
      };
      if (!res.ok || !data.user) {
        throw new Error(data.error || "Не удалось загрузить файл");
      }
      applyUser(data.user);
      toast("Аватар обновлён");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Ошибка", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setSaving(true);
    try {
      const data = await api<{ user: SessionUser }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ avatar_url: null }),
      });
      applyUser(data.user);
      toast("Аватар удалён");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Ошибка", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={name || user.name} src={avatarUrl || user.avatar_url} size={88} />
          <div className="min-w-0">
            <h2 className="font-display text-2xl">{user.name}</h2>
            <p className="text-sm text-muted">{user.email}</p>
            <p className="mt-1 text-xs text-muted">
              {user.role === "admin" ? "Администратор" : "Менеджер"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-paper/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <ImagePlus size={16} /> С компьютера
            </div>
            <p className="mb-3 text-xs text-muted">JPG, PNG, WEBP или GIF, до 2 МБ</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Загрузка…" : "Выбрать файл"}
            </button>
          </div>

          <div className="rounded-2xl border border-line bg-paper/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Link2 size={16} /> По ссылке
            </div>
            <p className="mb-3 text-xs text-muted">Вставьте прямой URL картинки</p>
            <input
              className="input"
              placeholder="https://example.com/photo.jpg"
              value={avatarUrl.startsWith("/api/avatars/") ? "" : avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost mt-2"
              disabled={saving || !avatarUrl.trim() || avatarUrl.startsWith("/api/avatars/")}
              onClick={async () => {
                setSaving(true);
                try {
                  const data = await api<{ user: SessionUser }>("/api/profile", {
                    method: "PATCH",
                    body: JSON.stringify({ avatar_url: avatarUrl.trim() }),
                  });
                  applyUser(data.user);
                  toast("Аватар обновлён");
                } catch (err) {
                  toast(err instanceof Error ? err.message : "Ошибка", "error");
                } finally {
                  setSaving(false);
                }
              }}
            >
              Применить ссылку
            </button>
          </div>
        </div>

        {user.avatar_url && (
          <button
            type="button"
            className="btn btn-ghost mt-3 text-danger"
            onClick={() => void removeAvatar()}
            disabled={saving}
          >
            <Trash2 size={16} /> Убрать аватар
          </button>
        )}
      </div>

      <form className="card space-y-3 p-6" onSubmit={saveProfile}>
        <h3 className="font-semibold">Данные профиля</h3>
        <label className="text-sm">
          Имя
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="text-sm">
          Email
          <input
            className="input mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Текущий пароль
            <input
              className="input mt-1"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="text-sm">
            Новый пароль
            <input
              className="input mt-1"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
            />
          </label>
        </div>
        <p className="text-xs text-muted">Пароль меняется, только если заполнить оба поля</p>
        <button className="btn btn-primary mt-2" disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </form>
    </div>
  );
}
