"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface SkillRadarProps {
  data: { skill: string; value: number; fullMark?: number }[];
  size?: number;
}

export default function SkillRadar({ data }: SkillRadarProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid stroke="hsl(24, 30%, 67%)" strokeOpacity={0.4} />
        <PolarAngleAxis
          dataKey="skill"
          tick={{ fill: "hsl(28, 12%, 35%)", fontSize: 12, fontFamily: "var(--font-body)" }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fill: "hsl(28, 10%, 50%)", fontSize: 10 }}
        />
        <Radar
          name="Навыки"
          dataKey="value"
          stroke="hsl(163, 90%, 28%)"
          fill="hsl(163, 90%, 28%)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
