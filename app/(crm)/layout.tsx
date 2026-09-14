import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getOverdueTaskCount, getSessionUser } from "@/lib/session";

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const overdueTasks = await getOverdueTaskCount(user.id, user.role);
  return (
    <AppShell user={user} overdueTasks={overdueTasks}>
      {children}
    </AppShell>
  );
}
