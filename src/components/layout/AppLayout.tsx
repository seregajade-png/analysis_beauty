"use client";

import { SessionProvider } from "next-auth/react";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64 p-8 lg:p-12">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
