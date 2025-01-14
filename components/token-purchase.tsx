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
    <div className="space-y-6">
      <div className="p-6 border rounded-lg bg-card">
        <h3 className="text-xl font-semibold mb-2">How Tokens Work</h3>
        <div className="flex items-center gap-2">
        </div>
        <div className="mt-4 text-sm text-muted-foreground space-y-1">
          <p>• Each card generation uses 1 token</p>
          <p>• New users get 10 tokens free</p>
          <p>• Cards generated with free tokens cannot be traded</p>
          <p>• Each trade has a one token fee </p>
        </div>
      </div>

      <div className="p-6 border rounded-lg bg-card">
        <h3 className="text-xl font-semibold mb-4">Purchase Tokens</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Starter Pack</h4>
            <p className="text-2xl font-bold mb-3">10 Tokens</p>
            <Button 
              onClick={() => handlePurchase(10)} 
              size="lg"
              variant="secondary"
              className="w-full"
            >
              Buy for $1
            </Button>
          </div>
          
          <div className="p-4 border rounded-lg bg-gradient-to-b from-blue-500/10 to-indigo-500/10">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium mr-2">The Big Boy</h4>
              <span className="text-xs bg-blue-500/20 text-blue-500 px-2 py-1 rounded-full">Best Value</span>
            </div>
            <p className="text-2xl font-bold mb-3">100 Tokens</p>
            <Button 
              onClick={() => handlePurchase(100)} 
              size="lg"
              variant="default"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Buy for $5
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
