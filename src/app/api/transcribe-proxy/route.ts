import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

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
    const rawFile = formData.get("file");
    const model = (formData.get("model") as string) ?? "whisper-1";
    const language = (formData.get("language") as string) ?? "ru";
    const responseFormat = (formData.get("response_format") as string) ?? "verbose_json";
    const fileNameHint = (formData.get("fileName") as string) ?? "";

    if (!rawFile || !(rawFile instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Debug: log what we received
    const receivedName = rawFile instanceof File ? rawFile.name : "blob";
    const receivedSize = rawFile.size;
    const receivedType = rawFile.type;
    console.log(`[TRANSCRIBE-PROXY] name=${receivedName} hint=${fileNameHint} size=${receivedSize} type=${receivedType}`);

    // Determine filename: prefer hint, then File.name, then fallback
    let fileName = fileNameHint || receivedName;
    if (!fileName || fileName === "blob" || fileName === "undefined") {
      fileName = "audio.mp3";
    }

    // Read as buffer and create file with explicit name using OpenAI's toFile
    const buffer = Buffer.from(await rawFile.arrayBuffer());
    const file = await toFile(buffer, fileName, { type: receivedType || "audio/mpeg" });

    console.log(`[TRANSCRIBE-PROXY] Sending to Whisper: ${fileName} (${buffer.length} bytes)`);

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
    console.error(`[TRANSCRIBE-PROXY] Error:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
