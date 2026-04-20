import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      error: "No session",
      detail: userError?.message ?? "getUser() returned null",
    }, { status: 401 });
  }

  // Query teams with this user's ID (bypasses nothing — uses real RLS)
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, professional_id");

  // Query team_members (what RLS allows)
  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select("team_id, athlete_id");

  return NextResponse.json({
    session_user_id:  user.id,
    session_email:    user.email,
    teams_visible:    teams ?? [],
    teams_error:      teamsError?.message,
    members_visible:  members ?? [],
    members_error:    membersError?.message,
  });
}
