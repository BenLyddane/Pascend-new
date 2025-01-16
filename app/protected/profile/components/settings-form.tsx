'use client';

import { useStatus } from "./status-context";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { StatusMessage } from "./status-message";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { updateSettings } from "@/app/actions/profile";
import { Database } from "@/types/database.types";

type User = {
  id: string;
};

type Settings = Database["public"]["Tables"]["player_settings"]["Row"];

interface SettingsFormProps {
  user: User;
  settings?: Settings;
}

export function SettingsForm({ user, settings }: SettingsFormProps) {
  const { setStatus } = useStatus();

  const formAction = async (formData: FormData) => {
    try {
      const result = await updateSettings(user.id, formData);
      setStatus({ 
        message: result.success || result.error || "An error occurred", 
        type: result.success ? "success" : "error" 
      });
    } catch (error) {
      setStatus({ message: "An unexpected error occurred", type: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-6">
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
              defaultChecked={settings?.email_notifications ?? true}
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
              defaultChecked={settings?.ingame_notifications ?? true}
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
              defaultValue={settings?.theme ?? "system"}
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
              defaultChecked={settings?.card_animation ?? true}
            />
          </div>
        </div>

        <SubmitButton>Save Preferences</SubmitButton>
      </form>

      <StatusMessage />
    </div>
  );
}
