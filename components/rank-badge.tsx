"use client";

import { Trophy, Medal, Award } from "lucide-react";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RankBadgeProps extends Omit<BadgeProps, "children"> {
  tier: string;
  points?: number;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showPoints?: boolean;
}

export function RankBadge({
  tier,
  points,
  size = "md",
  showIcon = true,
  showPoints = true,
  className,
  ...props
}: RankBadgeProps) {
  // Normalize tier name to handle case differences
  const normalizedTier = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
  
  // Get icon and color based on tier
  const { icon: Icon, color } = getRankDetails(normalizedTier);
  
  // Size classes
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1"
  };
  
  // Icon sizes
  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        sizeClasses[size],
        "font-medium border-2",
        color.border,
        color.bg,
        color.text,
        className
      )}
      {...props}
    >
      {showIcon && <Icon className="mr-1" size={iconSizes[size]} />}
      {normalizedTier}
      {showPoints && points !== undefined && (
        <span className="ml-1 opacity-80">({points})</span>
      )}
    </Badge>
  );
}

function getRankDetails(tier: string) {
  switch (tier) {
    case 'Master':
      return {
        icon: Trophy,
        color: {
          border: "border-purple-500",
          bg: "bg-purple-100 dark:bg-purple-950/30",
          text: "text-purple-700 dark:text-purple-400"
        }
      };
    case 'Diamond':
      return {
        icon: Trophy,
        color: {
          border: "border-blue-400",
          bg: "bg-blue-100 dark:bg-blue-950/30",
          text: "text-blue-700 dark:text-blue-400"
        }
      };
    case 'Platinum':
      return {
        icon: Medal,
        color: {
          border: "border-cyan-400",
          bg: "bg-cyan-100 dark:bg-cyan-950/30",
          text: "text-cyan-700 dark:text-cyan-400"
        }
      };
    case 'Gold':
      return {
        icon: Medal,
        color: {
          border: "border-yellow-400",
          bg: "bg-yellow-100 dark:bg-yellow-950/30",
          text: "text-yellow-700 dark:text-yellow-500"
        }
      };
    case 'Silver':
      return {
        icon: Medal,
        color: {
          border: "border-gray-400",
          bg: "bg-gray-100 dark:bg-gray-800/50",
          text: "text-gray-700 dark:text-gray-400"
        }
      };
    case 'Bronze':
      return {
        icon: Award,
        color: {
          border: "border-amber-700",
          bg: "bg-amber-100 dark:bg-amber-950/30",
          text: "text-amber-800 dark:text-amber-600"
        }
      };
    case 'Unranked':
      return {
        icon: Award,
        color: {
          border: "border-gray-300",
          bg: "bg-gray-50 dark:bg-gray-900/30",
          text: "text-gray-500 dark:text-gray-400"
        }
      };
    default:
      return {
        icon: Award,
        color: {
          border: "border-amber-700",
          bg: "bg-amber-100 dark:bg-amber-950/30",
          text: "text-amber-800 dark:text-amber-600"
        }
      };
  }
}
