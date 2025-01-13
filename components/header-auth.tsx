// components/header-auth.tsx
import { signOutAction } from "@/app/actions";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { createClient } from "@/utils/supabase/server";
import { LogOutIcon } from "lucide-react";
import NavLinks from "./nav-links";

export default async function HeaderAuth() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile if user exists
  let userDisplayName = null;
  if (user) {
    const { data: profile } = await supabase
      .from("player_profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    userDisplayName = profile?.display_name;
  }

  if (!hasEnvVars) {
    return (
      <div className="flex gap-4 items-center">
        <div>
          <Badge variant="default" className="font-normal pointer-events-none">
            Please update .env.local file with anon key and url
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            disabled
            className="opacity-75 cursor-none pointer-events-none"
          >
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="default"
            disabled
            className="opacity-75 cursor-none pointer-events-none"
          >
            <Link href="/sign-up">Sign up</Link>
          </Button>
        </div>
      </div>
    );
  }

  return user ? (
    <div className="flex items-center gap-6">
      <Button variant="ghost" asChild className="mr-2">
        <Link href="/protected">Pascend</Link>
      </Button>
      <NavLinks email={user.email!} displayName={userDisplayName} />
      <div className="flex items-center gap-4">
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <LogOutIcon size={16} />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-4">
      <Button variant="ghost" asChild>
        <Link href="/protected">Pascend</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant="default">
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
