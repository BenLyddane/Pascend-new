import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsForm } from "../components/settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch settings data
  const { data: settings, error } = await supabase
    .from("player_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error('Failed to fetch settings:', error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences & Notifications</CardTitle>
        <CardDescription>
          Customize your game experience and notification settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SettingsForm user={user} settings={settings} />
      </CardContent>
    </Card>
  );
}
