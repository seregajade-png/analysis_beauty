// =============================================
// ТИПЫ ДЛЯ AI АНАЛИЗА
// =============================================

export interface SalesStage {
  name: string;
  key: string;
  score: number; // 1-10
  comment: string;
  issues: StageIssue[];
}

export interface StageIssue {
  timecode?: string;
  originalPhrase: string;
  recommendation: string;
  reason: string;
  severity: "critical" | "warning" | "info";
}

export type ClientPsychotype = "triangle" | "square" | "circle" | "zigzag" | "mixed";

export interface PsychotypeAnalysis {
  type: ClientPsychotype;
  signs: string;
  adaptationScore: number;
  adaptationComment: string;
}

export interface ToxicWordEntry {
  original: string;
  ecological: string;
}

export interface CallAnalysisResult {
  overallScore: number;
  duration?: string;
  summary: string;
  clientPsychotype?: PsychotypeAnalysis;
  strengths: string[];
  criticalErrors: StageIssue[];
  toxicWords?: ToxicWordEntry[];
  stages: SalesStage[];
  developmentPlan: DevelopmentItem[];
  parasiteWords?: string[];
  speechPace?: string;
  confidenceLevel?: string;
}

export interface ChatRuleViolation {
  rule: string;
  example: string;
  recommendation: string;
}

export interface ChatAnalysisResult {
  overallScore: number;
  summary: string;
  clientPsychotype?: PsychotypeAnalysis;
  strengths: string[];
  criticalErrors: ChatIssue[];
  toxicWords?: ToxicWordEntry[];
  chatRulesViolations?: ChatRuleViolation[];
  stages: SalesStage[];
  messageAnalysis: MessageAnalysis[];
  additionalMetrics: ChatMetrics;
  developmentPlan: DevelopmentItem[];
}

export interface ChatIssue extends StageIssue {
  messageIndex?: number;
}

export interface MessageAnalysis {
  sender: "admin" | "client";
  text: string;
  issues: string[];
  improvements?: string;
  rating: "good" | "neutral" | "bad";
}

export interface ChatMetrics {
  responseSpeed?: string;
  avgMessageLength?: string;
  emojiUsage?: string;
  literacy?: string;
  closingAttempt?: string;
  personalization?: string;
  followUp?: string;
  summaryProvided?: string;
}

export interface DevelopmentItem {
  priority: number;
  skill: string;
  action: string;
  deadline: string;
}

// =============================================
// ТИПЫ ДЛЯ ТЕСТИРОВАНИЯ
// =============================================

export interface TestAnalysisResult {
  score: number;
  structureScore: number;
  contentScore: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  detailedAnalysis: string;
  recommendations: string[];
}

export interface RoleplayAnalysisResult extends TestAnalysisResult {
  fearLevel: "low" | "medium" | "high";
  fearDescription: string;
  parasiteWords: string[];
  speechCharacteristics: {
    pace: string;
    pauses: string;
    confidence: string;
    intonation: string;
  };
}

export interface ProductTestAnalysisResult extends TestAnalysisResult {
  knowledgeScore: number;
  benefitsPresentationScore: number;
  objectionHandlingScore: number;
  targetAudienceScore: number;
  weakAreas: string[];
}

export interface CRMTestAnalysisResult extends TestAnalysisResult {
  completenessScore: number;
  systematicScore: number;
  weakAreas: string[];
}

// =============================================
// ТИПЫ ДЛЯ КАРТОЧКИ АДМИНИСТРАТОРА
// =============================================

export type SkillPriority = "critical" | "medium" | "ok";

export interface AdminSkill {
  name: string;
  key: string;
  score: number;
  priority: SkillPriority;
  details: string;
  recommendations: string[];
}

export interface AdminCardData {
  adminName: string;
  salonName?: string;
  overallScore: number;
  skills: AdminSkill[];
  callSummary?: {
    totalCalls: number;
    avgScore: number;
    mainIssues: string[];
  };
  chatSummary?: {
    totalChats: number;
    avgScore: number;
    mainIssues: string[];
  };
  testSummary?: {
    practicalCase?: { score: number; feedback: string };
    roleplay?: { score: number; fearLevel: string; feedback: string };
    productKnowledge?: { score: number; weakAreas: string[] };
    crmKnowledge?: { score: number; feedback: string };
  };
  developmentPlan: DevelopmentItem[];
}

// =============================================
// ВСПОМОГАТЕЛЬНЫЕ ТИПЫ
// =============================================

export function getSkillColor(score: number): string {
  if (score <= 3) return "text-red-600";
  if (score <= 5) return "text-orange-500";
  if (score <= 7) return "text-yellow-500";
  return "text-green-600";
}

export function getSkillBgColor(score: number): string {
  if (score <= 3) return "bg-red-100 border-red-200";
  if (score <= 5) return "bg-orange-100 border-orange-200";
  if (score <= 7) return "bg-yellow-100 border-yellow-200";
  return "bg-green-100 border-green-200";
}

export function getSkillPriority(score: number): SkillPriority {
  if (score <= 5) return "critical";
  if (score <= 7) return "medium";
  return "ok";
}

export function getPriorityLabel(priority: SkillPriority): string {
  const labels = {
    critical: "Критично",
    medium: "Требует внимания",
    ok: "Хорошо",
  };
  return labels[priority];
}
