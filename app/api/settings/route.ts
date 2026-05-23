import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/settings";

export { DEFAULT_SETTINGS } from "@/lib/settings";
export type { UserSettings } from "@/lib/settings";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("user_settings")
    .select("settings")
    .eq("user_id", user.id)
    .single();

  const settings = data?.settings
    ? { ...DEFAULT_SETTINGS, ...data.settings }
    : DEFAULT_SETTINGS;

  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, settings: body }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
