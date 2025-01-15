'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function TradingNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-4 mb-4">
      <Link
        href="/protected/trading/market"
        className={cn(
          "px-4 py-2 rounded-md text-sm font-medium transition-colors",
          pathname === "/protected/trading/market"
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        Card Market
      </Link>
      <Link
        href="/protected/trading/listings"
        className={cn(
          "px-4 py-2 rounded-md text-sm font-medium transition-colors",
          pathname === "/protected/trading/listings"
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        My Listings
      </Link>
    </div>
  );
}
