"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProfileNav() {
  const pathname = usePathname();
  const currentTab = pathname.split('/').pop();

  return (
    <Tabs value={currentTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <Link href="/protected/profile/basic">
          <TabsTrigger value="basic">Profile</TabsTrigger>
        </Link>
        <Link href="/protected/profile/security">
          <TabsTrigger value="security">Security</TabsTrigger>
        </Link>
        <Link href="/protected/profile/stats">
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </Link>
        <Link href="/protected/profile/settings">
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </Link>
      </TabsList>
    </Tabs>
  );
}
