'use client';

import { useStatus } from "./status-context";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusMessage } from "./status-message";

import { updateSecuritySettings } from "@/app/actions/profile";

type User = {
  id: string;
};

interface SecurityFormProps {
  user: User;
}

export function SecurityForm({ user }: SecurityFormProps) {
  const { setStatus } = useStatus();

  const formAction = async (formData: FormData) => {
    try {
      const result = await updateSecuritySettings(user.id, formData);
      setStatus({ 
        message: result.success || result.error || "An error occurred", 
        type: result.success ? "success" : "error" 
      });
      
      if (result.success) {
        const form = document.querySelector('form') as HTMLFormElement;
        if (form) form.reset();
      }
    } catch (error) {
      setStatus({ message: "An unexpected error occurred", type: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
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

        <SubmitButton>Reset Password</SubmitButton>
      </form>

      <StatusMessage />
    </div>
  );
}
