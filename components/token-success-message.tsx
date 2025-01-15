'use client';

import { Alert, AlertDescription } from "@/components/ui/alert";

export function TokenSuccessMessage({
  success,
}: {
  success: string | string[] | undefined;
}) {
  const isSuccess = String(success) === 'true';

  if (!isSuccess) return null;

  return (
    <Alert className="bg-green-500/10 text-green-500 border-green-500/20">
      <AlertDescription>
        Your token purchase was successful! The tokens will be credited to
        your account shortly.
      </AlertDescription>
    </Alert>
  );
}
