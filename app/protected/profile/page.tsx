import { resetPasswordAction } from "@/app/actions";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { TokenPurchase } from "@/components/token-purchase";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

// Types for our profile data
import { Tables } from "@/types/database.types";

type PlayerProfile = Tables<"player_profiles">;

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

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { message: string; type?: string };
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

  // Get user metadata for display name
  const displayName =
    user.user_metadata?.display_name || user.email?.split("@")[0];

  // Function to get rank tier color
  const getRankColor = (tier: string) => {
    const colors = {
      bronze: "bg-orange-600",
      silver: "bg-gray-400",
      gold: "bg-yellow-500",
      platinum: "bg-cyan-400",
      diamond: "bg-blue-500",
      master: "bg-purple-600",
    };
    return colors[tier as keyof typeof colors] || "bg-gray-500";
  };

  async function updateProfile(formData: FormData) {
    "use server";

    const supabase = await createClient();

    // Get form data
    const display_name = formData.get("display_name")?.toString();
    const avatar_url = formData.get("avatar_url")?.toString();
    const email_notifications = formData.get("email_notifications") === "on";
    const ingame_notifications = formData.get("ingame_notifications") === "on";
    const card_animation = formData.get("card_animation") === "on";
    const theme = formData.get("theme")?.toString() || "system";

    // Update auth user metadata (display name)
    const { error: userError } = await supabase.auth.updateUser({
      data: { display_name },
    });

    if (userError) {
      return redirect(
        "/protected/profile?message=Failed to update display name&type=error"
      );
    }

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
        avatar_url,
        settings,
      })
      .eq("user_id", user?.id);

    if (profileError) {
      return redirect(
        "/protected/profile?message=Profile update failed&type=error"
      );
    }

    return redirect(
      "/protected/profile?message=Profile updated successfully&type=success"
    );
  }

  const settings = profile?.settings || defaultSettings;

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <Badge className={`${getRankColor(profile?.rank_tier)} text-white`}>
          {profile?.rank_tier?.toUpperCase() || 'UNRANKED'}
        </Badge>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens">
          <Card>
            <CardHeader>
              <CardTitle>Tokens</CardTitle>
              <CardDescription>
                Purchase and manage your tokens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-3xl font-bold">{profile?.tokens || 0}</p>
              </div>
              <TokenPurchase userId={user.id} currentTokens={profile?.tokens || 0} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Manage your public profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    name="display_name"
                    defaultValue={displayName}
                    placeholder="Your display name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    name="avatar_url"
                    type="url"
                    defaultValue={profile?.avatar_url || ""}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <SubmitButton>Update Profile</SubmitButton>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your password and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    type="password"
                    name="password"
                    placeholder="New password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm password"
                    required
                  />
                </div>

                <SubmitButton formAction={resetPasswordAction}>
                  Reset Password
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Game Statistics</CardTitle>
              <CardDescription>
                Your game performance and ranking history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Current Season</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Rank Points</p>
                    <p className="text-2xl font-bold">{profile?.rank_points}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Seasonal Points
                    </p>
                    <p className="text-2xl font-bold">
                      {profile?.seasonal_rank_points}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Season Highest
                    </p>
                    <p className="text-2xl font-bold">
                      {profile?.season_highest_rank}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Match History</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Total Matches
                    </p>
                    <p className="text-2xl font-bold">
                      {profile?.total_matches}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Wins</p>
                      <p className="text-xl font-bold text-green-500">
                        {profile?.wins}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Losses</p>
                      <p className="text-xl font-bold text-red-500">
                        {profile?.losses}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Draws</p>
                      <p className="text-xl font-bold text-yellow-500">
                        {profile?.draws}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Achievements</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Current Streak
                    </p>
                    <p className="text-2xl font-bold">
                      {profile?.current_streak}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Longest Streak
                    </p>
                    <p className="text-2xl font-bold">
                      {profile?.longest_streak}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold">
                      {profile?.total_matches
                        ? Math.round(
                            (profile?.wins / profile?.total_matches) * 100
                          )
                        : 0}
                      %
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Account Created</p>
                <p className="text-md">
                  {new Date(profile?.created_at).toLocaleDateString()}
                </p>
                {profile?.last_match_at && (
                  <>
                    <p className="text-sm text-muted-foreground">Last Match</p>
                    <p className="text-md">
                      {new Date(profile.last_match_at).toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Preferences & Notifications</CardTitle>
              <CardDescription>
                Customize your game experience and notification settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateProfile} className="space-y-6">
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
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Last updated:{" "}
                {new Date(
                  profile?.updated_at || Date.now()
                ).toLocaleDateString()}
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {searchParams?.message && (
        <Alert
          variant={searchParams.type === "error" ? "destructive" : "default"}
          className="mt-4"
        >
          <AlertDescription>{searchParams.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
