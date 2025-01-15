import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";

interface TokenDisplayProps {
  tokens: {
    total: number;
    purchased: number;
    free: number;
  } | null;
  usePurchasedToken: boolean;
  onTokenTypeChange: (usePurchased: boolean) => void;
}

export function TokenDisplay({
  tokens,
  usePurchasedToken,
  onTokenTypeChange,
}: TokenDisplayProps) {
  if (!tokens) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div>
            <div>Total Tokens: {tokens.total}</div>
            <div className="flex items-center space-x-4 mt-2">
              <div className="text-sm">
                <div>Purchased: {tokens.purchased}</div>
                <div>Free: {tokens.free}</div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="token-type"
                  checked={!usePurchasedToken}
                  onCheckedChange={(checked) => {
                    // Only allow switching if tokens are available
                    if (checked && tokens?.free === 0) return;
                    if (!checked && tokens?.purchased === 0) return;
                    onTokenTypeChange(!checked);
                  }}
                  disabled={
                    (usePurchasedToken && tokens?.purchased === 0) ||
                    (!usePurchasedToken && tokens?.free === 0)
                  }
                />
                <Label htmlFor="token-type" className="text-sm">
                  Use Free Tokens
                </Label>
              </div>
            </div>
            <div className="text-sm mt-1">
              {usePurchasedToken ? (
                <span className="text-green-500">
                  Next card will be tradeable (using purchased token)
                </span>
              ) : (
                <span className="text-yellow-500">
                  Next card will not be tradeable (using free token)
                </span>
              )}
            </div>
          </div>
        </div>
        {(tokens.total === 0 ||
          (usePurchasedToken && tokens.purchased === 0) ||
          (!usePurchasedToken && tokens.free === 0)) && (
          <Link
            href="/protected/tokens"
            className="text-blue-500 hover:text-blue-700 underline"
          >
            Buy More Tokens
          </Link>
        )}
      </div>
    </div>
  );
}
