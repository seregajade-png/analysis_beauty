import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOrCreateSettings(userId: string) {
  let settings = await prisma.salonSettings.findUnique({ where: { userId } });
  if (!settings) {
    settings = await prisma.salonSettings.create({
      data: { userId },
    });
  }
  return settings;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const settings = await getOrCreateSettings(session.user.id);
  const products = await prisma.product.findMany({
    where: { salonSettingsId: settings.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role === "ADMIN") {
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });
  }

  const body = await req.json();
  const settings = await getOrCreateSettings(session.user.id);

  const product = await prisma.product.create({
    data: {
      salonSettingsId: settings.id,
      name: body.name,
      category: body.category,
      characteristics: body.characteristics,
      advantages: body.advantages,
      benefits: body.benefits,
      price: body.price ? parseFloat(body.price) : null,
      targetAudience: body.targetAudience,
      objections: body.objections ?? {},
    },
  });

  return NextResponse.json(product, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role === "ADMIN") {
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });
  }

  const body = await req.json();
  const settings = await getOrCreateSettings(session.user.id);

  const product = await prisma.product.findFirst({
    where: { id: body.id, salonSettingsId: settings.id },
  });

  if (!product) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const updated = await prisma.product.update({
    where: { id: body.id },
    data: {
      name: body.name,
      category: body.category,
      characteristics: body.characteristics,
      advantages: body.advantages,
      benefits: body.benefits,
      price: body.price ? parseFloat(body.price) : null,
      targetAudience: body.targetAudience,
      objections: body.objections,
      isActive: body.isActive,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role === "ADMIN") {
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id обязателен" }, { status: 400 });
  }

  const settings = await getOrCreateSettings(session.user.id);
  const product = await prisma.product.findFirst({
    where: { id, salonSettingsId: settings.id },
  });

  if (!product) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
