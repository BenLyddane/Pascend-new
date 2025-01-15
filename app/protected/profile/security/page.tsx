import { resetPasswordAction } from "@/app/actions";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
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

export default async function SecurityPage({
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Manage your password and security preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              type="password"
              name="password"
              id="password"
              placeholder="New password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              placeholder="Confirm password"
              required
            />
          </div>

          <SubmitButton formAction={resetPasswordAction}>
            Reset Password
          </SubmitButton>
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
