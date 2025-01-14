// components/nav-links.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { GamepadIcon, TrophyIcon, LayersIcon, UserIcon, ShoppingCartIcon, CoinsIcon, PlusCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLinksProps {
  email: string;
  displayName?: string | null;
}

export default function NavLinks({ email, displayName }: NavLinksProps) {
  const pathname = usePathname();

  const navigation = [
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
      href: "/protected/profile",
      icon: <CoinsIcon size={16} />,
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
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          {item.icon}
          <span>{item.name}</span>
        </Link>
      ))}
    </nav>
  );
}
