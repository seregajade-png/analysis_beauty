"use client";

import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  accent?: boolean;
}

export default function StatCard({ title, value, subtitle, icon, accent }: StatCardProps) {
  return (
    <div className={`card-salon p-6 animate-fade-in ${accent ? "border-primary" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-heading font-bold mt-2 text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-full bg-mint flex items-center justify-center text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
