'use client';

import { StatusProvider } from "./components/status-context";
import ProfileNav from "./components/profile-nav";
import { Card } from "@/components/ui/card";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StatusProvider>
      <div className="container mx-auto py-6">
        <div className="grid grid-cols-4 gap-6">
          <aside className="col-span-1">
            <Card className="p-4">
              <ProfileNav />
            </Card>
          </aside>
          <main className="col-span-3">
            <Card className="p-6">
              {children}
            </Card>
          </main>
        </div>
      </div>
    </StatusProvider>
  );
}
