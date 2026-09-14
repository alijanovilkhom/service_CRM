"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "@/types/crm.types";

type SessionValue = {
  user: SessionUser;
  setUser: (user: SessionUser) => void;
  overdueTasks: number;
  setOverdueTasks: React.Dispatch<React.SetStateAction<number>>;
};

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within AppShell");
  return ctx;
}
