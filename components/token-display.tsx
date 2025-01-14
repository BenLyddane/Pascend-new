import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface TokenDisplayProps {
  tokens: number;
  purchasedTokens: number;
  minimal?: boolean;
}

export function TokenDisplay({ tokens, purchasedTokens, minimal = false }: TokenDisplayProps) {
  const totalTokens = tokens + purchasedTokens;

  if (minimal) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Tokens:</span>
        <span className="font-semibold">{totalTokens}</span>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className="text-2xl font-bold">{totalTokens}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Free Tokens</p>
              <p className="text-lg font-semibold">{tokens}</p>
              <p className="text-xs text-muted-foreground mt-1">Not tradeable</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Purchased Tokens</p>
              <p className="text-lg font-semibold">{purchasedTokens}</p>
              <p className="text-xs text-green-500 mt-1">Tradeable</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
