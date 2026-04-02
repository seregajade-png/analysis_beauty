import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const PROXY_SECRET = process.env.NEXTAUTH_SECRET;

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-proxy-secret");
  if (!secret || secret !== PROXY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const model = (formData.get("model") as string) ?? "whisper-1";
    const language = (formData.get("language") as string) ?? "ru";
    const responseFormat = (formData.get("response_format") as string) ?? "verbose_json";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model,
      language,
      response_format: responseFormat as "verbose_json",
      timestamp_granularities: ["segment"],
    });

    return NextResponse.json(transcription);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
