'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { UserIcon, SettingsIcon, ShieldIcon, BarChartIcon, ScrollTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProfileNav() {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Basic Profile",
      href: "/protected/profile/basic",
      icon: <UserIcon size={16} />,
    },
    {
      name: "Settings",
      href: "/protected/profile/settings",
      icon: <SettingsIcon size={16} />,
    },
    {
      name: "Security",
      href: "/protected/profile/security",
      icon: <ShieldIcon size={16} />,
    },
    {
      name: "Stats",
      href: "/protected/profile/stats",
      icon: <BarChartIcon size={16} />,
    },
    {
      name: "Rules",
      href: "/protected/profile/rules",
      icon: <ScrollTextIcon size={16} />,
    },
  ];

  return (
    <nav className="flex flex-col space-y-2 mb-8">
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
