import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

const defaultSettings = {
  notifications: {
    email: true,
    inGame: true,
  },
  preferences: {
    theme: "system",
    cardAnimation: true,
  },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { message?: string; type?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from("player_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const settings = profile?.settings || defaultSettings;

  async function updateSettings(formData: FormData) {
    "use server";

    const supabase = await createClient();

    // Get form data
    const email_notifications = formData.get("email_notifications") === "on";
    const ingame_notifications = formData.get("ingame_notifications") === "on";
    const card_animation = formData.get("card_animation") === "on";
    const theme = formData.get("theme")?.toString() || "system";

    // Update profile settings
    const settings = {
      notifications: {
        email: email_notifications,
        inGame: ingame_notifications,
      },
      preferences: {
        theme,
        cardAnimation: card_animation,
      },
    };

    const { error: profileError } = await supabase
      .from("player_profiles")
      .update({
        settings,
      })
      .eq("user_id", user?.id);

    if (profileError) {
      return redirect("/protected/profile/settings?message=Settings update failed&type=error");
    }

    return redirect("/protected/profile/settings?message=Settings updated successfully&type=success");
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
        <form action={updateSettings} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive game updates and announcements
                </p>
              </div>
              <Switch
                name="email_notifications"
                defaultChecked={settings?.notifications?.email ?? true}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>In-Game Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications during gameplay
                </p>
              </div>
              <Switch
                name="ingame_notifications"
                defaultChecked={settings?.notifications?.inGame ?? true}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold">Game Preferences</h3>
            <div className="space-y-2">
              <Label>Theme Preference</Label>
              <Select
                name="theme"
                defaultValue={settings?.preferences?.theme ?? "system"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Card Animations</Label>
                <p className="text-sm text-muted-foreground">
                  Enable card movement animations
                </p>
              </div>
              <Switch
                name="card_animation"
                defaultChecked={settings?.preferences?.cardAnimation ?? true}
              />
            </div>
          </div>

          <SubmitButton>Save Preferences</SubmitButton>
        </form>

        {searchParams?.message && (
          <Alert
            variant={searchParams?.type === "error" ? "destructive" : "default"}
            className="mt-4"
          >
            <AlertDescription>{searchParams.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Last updated:{" "}
          {new Date(profile?.updated_at || Date.now()).toLocaleDateString()}
        </p>
      </CardFooter>
    </Card>
  );
}
