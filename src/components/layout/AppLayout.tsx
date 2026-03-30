"use client";

import { SessionProvider } from "next-auth/react";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="md:ml-64 pt-14 md:pt-0 p-4 md:p-8 lg:p-12">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
