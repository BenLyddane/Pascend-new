'use client';

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useStatus } from "./status-context";

export function StatusMessage() {
  const { status } = useStatus();

  if (!status?.message) return null;

  return (
    <Alert
      variant={status.type === "error" ? "destructive" : "default"}
      className="mt-4"
    >
      <AlertDescription>{status.message}</AlertDescription>
    </Alert>
  );
}
