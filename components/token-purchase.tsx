"use client";

import {
  TokenAmount,
  createTokenPurchaseSession,
} from "@/app/actions/purchaseTokens";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TokenPurchaseProps {
  userId: string;
  currentTokens: number;
}

export function TokenPurchase({ userId, currentTokens }: TokenPurchaseProps) {
  const { toast } = useToast();

  const handlePurchase = async (amount: TokenAmount) => {
    try {
      const { url } = await createTokenPurchaseSession(userId, amount);
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate token purchase. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Your Tokens</h3>
          <p className="text-sm text-muted-foreground">
            Current Balance: {currentTokens}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handlePurchase(10)}>Buy 10 Tokens ($1)</Button>
          <Button onClick={() => handlePurchase(100)}>
            Buy 100 Tokens ($5)
          </Button>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        <p>• Each card generation uses 1 token</p>
        <p>• New users get 10 tokens free</p>
        <p>• Buy in bulk to save!</p>
      </div>
    </div>
  );
}
