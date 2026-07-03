import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dualMode = user.user_metadata?.dual_mode === true;

  return (
    <DashboardShell coachId={user.id} userEmail={user.email ?? ""} dualMode={dualMode}>
      {children}
    </DashboardShell>
  );
}
