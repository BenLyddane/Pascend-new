// components/nav-links.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  GamepadIcon,
  TrophyIcon,
  LayersIcon,
  UserIcon,
  ShoppingCartIcon,
  CoinsIcon,
  PlusCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLinksProps {
  email: string;
  displayName?: string | null;
  free_tokens?: number;
  purchased_tokens?: number;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  highlight?: boolean;
  extra?: React.ReactNode;
}

export default function NavLinks({ email, displayName, free_tokens = 0, purchased_tokens = 0 }: NavLinksProps) {
  const pathname = usePathname();
  const totalTokens = (free_tokens || 0) + (purchased_tokens || 0);

  const navigation: NavItem[] = [
    { name: "Play", href: "/protected/play", icon: <GamepadIcon size={16} /> },
    {
      name: "Collection",
      href: "/protected/collection",
      icon: <LayersIcon size={16} />,
    },
    {
      name: "Create Cards",
      href: "/protected/collection/create-cards",
      icon: <PlusCircleIcon size={16} />,
    },
    {
      name: "Trading",
      href: "/protected/trading",
      icon: <ShoppingCartIcon size={16} />,
    },
    {
      name: "Leaderboard",
      href: "/protected/leaderboard",
      icon: <TrophyIcon size={16} />,
    },
    {
      name: "Tokens",
      href: "/protected/tokens",
      icon: <CoinsIcon size={16} />,
      highlight: true,
      extra: <span className="ml-2 font-semibold">{totalTokens}</span>,
    },
    {
      name: displayName || email,
      href: "/protected/profile",
      icon: <UserIcon size={16} />,
    },
  ];

  return (
    <nav className="flex items-center space-x-4">
      {navigation.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === item.href
              ? "bg-accent text-foreground"
              : item.highlight
              ? "bg-gradient-to-b from-blue-500/10 to-indigo-500/10 text-blue-600 hover:text-blue-700 hover:bg-gradient-to-b hover:from-blue-500/20 hover:to-indigo-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          {item.icon}
          <span>{item.name}</span>
          {item.extra}
        </Link>
      ))}
    </nav>
  );
}
