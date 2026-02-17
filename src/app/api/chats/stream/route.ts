import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { streamAnalysis, parseJsonResponse } from "@/lib/ai/analyzer";
import { CHAT_ANALYSIS_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { ChatAnalysisResult } from "@/types";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

function sse(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  console.log("[STREAM] Auth user:", session?.user?.email ?? "NONE");
  if (!session?.user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  let chatText = "";
  let source = "TEXT";
  let adminName = "";
  let title = "";

  try {
    const contentType = req.headers.get("content-type") ?? "";
    console.log("[STREAM] Content-Type:", contentType);
    if (contentType.includes("multipart/form-data")) {
      const fd = await req.formData();
      chatText = (fd.get("text") as string) ?? "";
      source = (fd.get("source") as string) ?? "TEXT";
      adminName = (fd.get("adminName") as string) ?? "";
      title = (fd.get("title") as string) ?? "";
      console.log("[STREAM] FormData parsed, text length:", chatText.length);
    } else {
      const body = await req.json();
      chatText = body.text ?? "";
      source = body.source ?? "TEXT";
      adminName = body.adminName ?? "";
      title = body.title ?? "";
      console.log("[STREAM] JSON parsed, text length:", chatText.length);
    }
  } catch (e) {
    console.error("[STREAM] Parse error:", e);
    return Response.json({ error: "Ошибка разбора запроса: " + String(e) }, { status: 400 });
  }

  if (!chatText.trim()) {
    console.log("[STREAM] Empty text, returning 400");
    return Response.json({ error: "Текст не предоставлен" }, { status: 400 });
  }

  // Создаём запись в БД
  const record = await prisma.chatAnalysis.create({
    data: {
      userId: session.user.id,
      adminName: adminName || session.user.name,
      title: title || "Переписка",
      source: source as "WHATSAPP" | "TELEGRAM" | "INSTAGRAM" | "TEXT" | "SCREENSHOT",
      rawText: chatText,
      imageUrls: [],
      status: "ANALYZING",
    },
  });

  const userMessage = `
Проанализируй следующую переписку администратора салона красоты с клиентом.
${adminName ? `Имя администратора: ${adminName}` : ""}
${source ? `Платформа: ${source}` : ""}

ПЕРЕПИСКА:
${chatText}

Дай детальный анализ по всем этапам и каждому сообщению администратора.
`;

  // TransformStream — ответ уходит клиенту мгновенно
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Асинхронная стриминг-логика в фоне
  (async () => {
    let accumulated = "";
    try {
      for await (const chunk of streamAnalysis(CHAT_ANALYSIS_SYSTEM_PROMPT, userMessage)) {
        accumulated += chunk;
        await writer.write(sse("chunk", chunk));
      }

      const result = parseJsonResponse<ChatAnalysisResult>(accumulated);

      const stageScores = result.stages?.reduce(
        (acc: Record<string, number>, stage) => {
          acc[stage.key] = stage.score;
          return acc;
        },
        {}
      ) ?? {};

      await prisma.chatAnalysis.update({
        where: { id: record.id },
        data: {
          status: "COMPLETED",
          overallScore: result.overallScore,
          analysisResult: result as object,
          stageScores,
        },
      });

      await writer.write(sse("done", { id: record.id, result }));
    } catch (e) {
      console.error("[STREAM ERROR]", e);
      await prisma.chatAnalysis.update({
        where: { id: record.id },
        data: { status: "FAILED", errorMessage: String(e) },
      }).catch(() => {});
      await writer.write(sse("error", String(e)));
    } finally {
      await writer.close();
    }
  })();

  // Ответ отправляется СРАЗУ — не дожидаясь первого чанка
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
