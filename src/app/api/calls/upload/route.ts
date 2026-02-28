import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { ALLOWED_AUDIO_TYPES, MAX_AUDIO_SIZE } from "@/lib/audio/transcribe";

export async function POST(req: NextRequest) {
  console.log("[UPLOAD] POST received");
  const session = await auth();
  console.log("[UPLOAD] session:", session?.user?.id ?? "null");
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File;
    const adminName = formData.get("adminName") as string;
    const title = formData.get("title") as string;

    if (!file) {
      return NextResponse.json(
        { error: "Файл не предоставлен" },
        { status: 400 }
      );
    }

    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Неподдерживаемый формат файла. Разрешены: mp3, wav, ogg, m4a, aac`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: `Файл слишком большой. Максимум 100 МБ` },
        { status: 400 }
      );
    }

    // Сохраняем файл
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "audio");
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Создаём запись в БД
    const analysis = await prisma.callAnalysis.create({
      data: {
        userId: session.user.id,
        adminName: adminName || session.user.name,
        title: title || file.name,
        audioUrl: `/uploads/audio/${fileName}`,
        audioFileName: file.name,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      id: analysis.id,
      message: "Файл загружен успешно",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Ошибка при загрузке файла" },
      { status: 500 }
    );
  }
}
