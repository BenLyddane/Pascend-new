import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function BasicProfilePage({
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

  // Get user metadata for display name
  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0];

  async function updateProfile(formData: FormData) {
    "use server";

    const supabase = await createClient();

    // Get form data
    const display_name = formData.get("display_name")?.toString();
    const avatar_url = formData.get("avatar_url")?.toString();

    // Update auth user metadata (display name)
    const { error: userError } = await supabase.auth.updateUser({
      data: { display_name },
    });

    if (userError) {
      return redirect("/protected/profile/basic?message=Failed to update display name&type=error");
    }

    // Update profile settings
    const { error: profileError } = await supabase
      .from("player_profiles")
      .update({
        avatar_url,
      })
      .eq("user_id", user?.id);

    if (profileError) {
      return redirect("/protected/profile/basic?message=Profile update failed&type=error");
    }

    return redirect("/protected/profile/basic?message=Profile updated successfully&type=success");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Manage your public profile information</CardDescription>
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

        {searchParams?.message && (
          <Alert
            variant={searchParams?.type === "error" ? "destructive" : "default"}
            className="mt-4"
          >
            <AlertDescription>{searchParams.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
