import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return "—";
  return score.toFixed(1);
}

export function getScoreColor(score: number): string {
  if (score <= 3) return "text-red-600";
  if (score <= 5) return "text-orange-500";
  if (score <= 7) return "text-yellow-600";
  return "text-green-600";
}

export function getScoreBg(score: number): string {
  if (score <= 3) return "bg-red-50 border-red-200 text-red-700";
  if (score <= 5) return "bg-orange-50 border-orange-200 text-orange-700";
  if (score <= 7) return "bg-yellow-50 border-yellow-200 text-yellow-700";
  return "bg-green-50 border-green-200 text-green-700";
}

export function getScoreLabel(score: number): string {
  if (score <= 3) return "Критично";
  if (score <= 5) return "Требует внимания";
  if (score <= 7) return "Средне";
  return "Хорошо";
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
