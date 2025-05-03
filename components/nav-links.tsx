// components/nav-links.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GamepadIcon,
  TrophyIcon,
  LayersIcon,
  UserIcon,
  ShoppingCartIcon,
  CoinsIcon,
  PlusCircleIcon,
  Trophy,
  Medal,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { RankBadge } from "@/components/rank-badge";

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
  const [playerRank, setPlayerRank] = useState<{
    rank_points: number;
    rank_tier: string;
  } | null>(null);
  
  // Fetch player's rank when component mounts
  useEffect(() => {
    const fetchPlayerRank = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from("ranked_stats")
            .select("rank_points, rank_tier")
            .eq("user_id", user.id)
            .single();
          
          if (!error && data) {
            setPlayerRank(data);
          } else {
            // Use default rank if there's an error or no data
            // We don't try to create stats from the client side due to RLS policies
            setPlayerRank({
              rank_points: 1000,
              rank_tier: "Bronze"
            });
          }
        }
      } catch (error) {
        console.error("Error fetching player rank:", error);
        // Set default rank on error
        setPlayerRank({
          rank_points: 1000,
          rank_tier: "Bronze"
        });
      }
    };
    
    fetchPlayerRank();
  }, []);

  // Function to get rank icon and color
  const getRankIconAndColor = (tier: string) => {
    const normalizedTier = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
    
    switch (normalizedTier) {
      case 'Master':
        return { 
          icon: Trophy, 
          color: "text-purple-500"
        };
      case 'Diamond':
        return { 
          icon: Trophy, 
          color: "text-blue-400"
        };
      case 'Platinum':
        return { 
          icon: Medal, 
          color: "text-cyan-400"
        };
      case 'Gold':
        return { 
          icon: Medal, 
          color: "text-yellow-400"
        };
      case 'Silver':
        return { 
          icon: Medal, 
          color: "text-gray-400"
        };
      case 'Bronze':
        return { 
          icon: Award, 
          color: "text-amber-700"
        };
      case 'Unranked':
      default:
        return { 
          icon: Award, 
          color: "text-gray-500"
        };
    }
  };

  const navigation: NavItem[] = [
    { name: "Play", href: "/protected/play/practice", icon: <GamepadIcon size={16} /> },
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
    // Rank display (links to leaderboard)
    {
      name: playerRank ? playerRank.rank_tier : "Unranked",
      href: "/protected/leaderboard", // Link to leaderboard
      icon: playerRank ? (() => {
        const { icon: Icon, color } = getRankIconAndColor(playerRank.rank_tier);
        return <Icon className={color} size={16} />;
      })() : <Award size={16} className="text-gray-500" />,
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
      extra: playerRank && (() => {
        const { icon: Icon, color } = getRankIconAndColor(playerRank.rank_tier);
        return <Icon className={`ml-2 ${color}`} size={16} />;
      })(),
    },
  ];

  return (
    <nav className="flex items-center space-x-4 overflow-x-auto">
      {navigation.map((item, index) => {
        // Special handling for the user profile link
        if (item.name === (displayName || email)) {
          return (
            <div key={index} className="flex items-center">
              <Link
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
            </div>
          );
        }
        
        // Special handling for rank display (links to leaderboard)
        if (item.href === "/protected/leaderboard" && (item.name === "Unranked" || playerRank?.rank_tier === item.name)) {
          return (
            <Link
              key={index}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {item.icon}
              <RankBadge 
                tier={item.name} 
                points={playerRank?.rank_points} 
                size="sm" 
              />
            </Link>
          );
        }
        
        // Regular navigation items
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
              pathname === item.href
                ? "bg-accent text-foreground"
                : item.highlight
                ? "bg-gradient-to-b from-blue-500/10 to-indigo-500/10 text-blue-600 hover:text-blue-700 hover:bg-gradient-to-b hover:from-blue-500/20 hover:to-indigo-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {item.icon}
            <span className="max-w-none">{item.name}</span>
            {item.extra}
          </Link>
        );
      })}
    </nav>
  );
}
