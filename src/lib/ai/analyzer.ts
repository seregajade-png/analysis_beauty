import OpenAI from "openai";
import {
  CALL_ANALYSIS_SYSTEM_PROMPT,
  CHAT_ANALYSIS_SYSTEM_PROMPT,
  PRACTICAL_CASE_SYSTEM_PROMPT,
  ROLEPLAY_ANALYSIS_SYSTEM_PROMPT,
  PRODUCT_KNOWLEDGE_SYSTEM_PROMPT,
  CRM_KNOWLEDGE_SYSTEM_PROMPT,
  ADMIN_CARD_SYSTEM_PROMPT,
} from "./prompts";
import type {
  CallAnalysisResult,
  ChatAnalysisResult,
  TestAnalysisResult,
  RoleplayAnalysisResult,
  ProductTestAnalysisResult,
  CRMTestAnalysisResult,
} from "@/types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = "gpt-4o-mini";

async function callAI(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Пустой ответ от AI");
  return content;
}

function parseJsonResponse<T>(text: string): T {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Не удалось найти JSON в ответе AI");
  }
  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    throw new Error("Ошибка парсинга JSON ответа AI");
  }
}

// =============================================
// АНАЛИЗ ЗВОНКА
// =============================================

export async function analyzeCall(
  transcription: string,
  adminName?: string
): Promise<CallAnalysisResult> {
  const userMessage = `
Проанализируй следующую транскрипцию телефонного звонка администратора салона красоты.
${adminName ? `Имя администратора: ${adminName}` : ""}

ТРАНСКРИПЦИЯ ЗВОНКА:
${transcription}

Дай детальный анализ по всем 7 этапам продаж. Будь конкретным — цитируй реальные фразы из транскрипции.
`;

  const response = await callAI(CALL_ANALYSIS_SYSTEM_PROMPT, userMessage);
  return parseJsonResponse<CallAnalysisResult>(response);
}

// =============================================
// АНАЛИЗ ПЕРЕПИСКИ
// =============================================

export async function analyzeChat(
  chatText: string,
  adminName?: string,
  source?: string
): Promise<ChatAnalysisResult> {
  const userMessage = `
Проанализируй следующую переписку администратора салона красоты с клиентом.
${adminName ? `Имя администратора: ${adminName}` : ""}
${source ? `Платформа: ${source}` : ""}

ПЕРЕПИСКА:
${chatText}

Дай детальный анализ по всем этапам и каждому сообщению администратора.
`;

  const response = await callAI(CHAT_ANALYSIS_SYSTEM_PROMPT, userMessage);
  return parseJsonResponse<ChatAnalysisResult>(response);
}

// =============================================
// АНАЛИЗ ПРАКТИЧЕСКОГО КЕЙСА
// =============================================

export async function analyzePracticalCase(
  scenario: string,
  adminResponse: string,
  adminName?: string
): Promise<TestAnalysisResult> {
  const userMessage = `
Оцени ответ администратора на практический кейс.
${adminName ? `Имя администратора: ${adminName}` : ""}

КЕЙС (ситуация):
${scenario}

ОТВЕТ АДМИНИСТРАТОРА:
${adminResponse}

Дай честную оценку с конкретными примерами и рекомендациями.
`;

  const response = await callAI(PRACTICAL_CASE_SYSTEM_PROMPT, userMessage);
  return parseJsonResponse<TestAnalysisResult>(response);
}

// =============================================
// АНАЛИЗ РОЛЕВОЙ ИГРЫ
// =============================================

export async function analyzeRoleplay(
  clientPhrase: string,
  adminResponse: string,
  adminName?: string
): Promise<RoleplayAnalysisResult> {
  const userMessage = `
Оцени ответ администратора на ролевую ситуацию.
${adminName ? `Имя администратора: ${adminName}` : ""}

ФРАЗА КЛИЕНТА:
"${clientPhrase}"

ОТВЕТ АДМИНИСТРАТОРА:
"${adminResponse}"

Оцени структуру ответа, уверенность, слова-паразиты и уровень страха звонков.
`;

  const response = await callAI(ROLEPLAY_ANALYSIS_SYSTEM_PROMPT, userMessage);
  return parseJsonResponse<RoleplayAnalysisResult>(response);
}

// =============================================
// ТЕСТ НА ЗНАНИЕ ПРОДУКТА
// =============================================

export async function analyzeProductKnowledge(
  product: {
    name: string;
    characteristics: string;
    advantages: string;
    benefits: string;
    price?: number;
    targetAudience?: string;
    objections?: Record<string, string>;
  },
  questionsAndAnswers: { question: string; answer: string }[]
): Promise<ProductTestAnalysisResult> {
  const productInfo = `
Продукт: ${product.name}
Характеристики: ${product.characteristics}
Преимущества: ${product.advantages}
Выгоды для клиента: ${product.benefits}
${product.price ? `Цена: ${product.price} руб.` : ""}
${product.targetAudience ? `Целевая аудитория: ${product.targetAudience}` : ""}
${
  product.objections
    ? `Частые возражения и ответы: ${JSON.stringify(product.objections)}`
    : ""
}
`;

  const qaText = questionsAndAnswers
    .map((qa, i) => `Вопрос ${i + 1}: ${qa.question}\nОтвет: ${qa.answer}`)
    .join("\n\n");

  const userMessage = `
Оцени знание администратором продукта "${product.name}".

ОТВЕТЫ АДМИНИСТРАТОРА:
${qaText}
`;

  const response = await callAI(
    PRODUCT_KNOWLEDGE_SYSTEM_PROMPT(productInfo),
    userMessage
  );
  return parseJsonResponse<ProductTestAnalysisResult>(response);
}

// =============================================
// ТЕСТ НА ЗНАНИЕ CRM
// =============================================

export async function analyzeCRMKnowledge(
  questionsAndAnswers: { question: string; answer: string }[],
  adminName?: string
): Promise<CRMTestAnalysisResult> {
  const qaText = questionsAndAnswers
    .map((qa, i) => `Вопрос ${i + 1}: ${qa.question}\nОтвет: ${qa.answer}`)
    .join("\n\n");

  const userMessage = `
Оцени знание администратором работы с CRM и клиентской базой.
${adminName ? `Имя администратора: ${adminName}` : ""}

ОТВЕТЫ АДМИНИСТРАТОРА:
${qaText}

Дай честную оценку с конкретными рекомендациями по улучшению работы с базой клиентов.
`;

  const response = await callAI(CRM_KNOWLEDGE_SYSTEM_PROMPT, userMessage);
  return parseJsonResponse<CRMTestAnalysisResult>(response);
}

// =============================================
// ГЕНЕРАЦИЯ КАРТОЧКИ АДМИНИСТРАТОРА
// =============================================

export async function generateAdminCard(data: {
  adminName: string;
  callResults?: Array<{ score: number; stages: unknown[] }>;
  chatResults?: Array<{ score: number; stages: unknown[] }>;
  testResults?: {
    practicalCase?: { score: number; feedback: string };
    roleplay?: {
      score: number;
      fearLevel: string;
      feedback: string;
    };
    productKnowledge?: { score: number; weakAreas: string[] };
    crmKnowledge?: { score: number; feedback: string };
  };
}): Promise<{
  overallScore: number;
  summary: string;
  skills: unknown[];
  developmentPlan: unknown[];
}> {
  const userMessage = `
Сформируй итоговую карточку администратора на основе результатов оценки.

Имя администратора: ${data.adminName}

${
  data.callResults?.length
    ? `РЕЗУЛЬТАТЫ АНАЛИЗА ЗВОНКОВ (${data.callResults.length} звонков):
Средняя оценка: ${(data.callResults.reduce((s, r) => s + r.score, 0) / data.callResults.length).toFixed(1)}/10
`
    : ""
}
${
  data.chatResults?.length
    ? `РЕЗУЛЬТАТЫ АНАЛИЗА ПЕРЕПИСОК (${data.chatResults.length} переписок):
Средняя оценка: ${(data.chatResults.reduce((s, r) => s + r.score, 0) / data.chatResults.length).toFixed(1)}/10
`
    : ""
}
${
  data.testResults
    ? `РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:
${data.testResults.practicalCase ? `- Практический кейс: ${data.testResults.practicalCase.score}/10` : ""}
${data.testResults.roleplay ? `- Ролевая игра: ${data.testResults.roleplay.score}/10, уровень страха: ${data.testResults.roleplay.fearLevel}` : ""}
${data.testResults.productKnowledge ? `- Знание продуктов: ${data.testResults.productKnowledge.score}/10` : ""}
${data.testResults.crmKnowledge ? `- Знание CRM: ${data.testResults.crmKnowledge.score}/10` : ""}
`
    : ""
}

Сформируй итоговую оценку навыков и план развития.
`;

  const response = await callAI(ADMIN_CARD_SYSTEM_PROMPT, userMessage);
  return parseJsonResponse(response);
}

// =============================================
// СТРИМИНГ ОТВЕТА
// =============================================

export async function* streamAnalysis(
  systemPrompt: string,
  userMessage: string
): AsyncGenerator<string> {
  const stream = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
