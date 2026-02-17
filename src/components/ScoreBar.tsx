"use client";

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore?: number;
}

export default function ScoreBar({ label, score, maxScore = 100 }: ScoreBarProps) {
  const pct = Math.min((score / maxScore) * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-muted-foreground">{score}/{maxScore}</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
