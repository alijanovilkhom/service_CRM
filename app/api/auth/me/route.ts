import { NextResponse } from "next/server";
import { getOverdueTaskCount } from "@/lib/session";
import { requireUser } from "@/lib/api";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const overdueTasks = await getOverdueTaskCount(auth.user.id, auth.user.role);

  return NextResponse.json({
    user: auth.user,
    overdueTasks,
  });
}
