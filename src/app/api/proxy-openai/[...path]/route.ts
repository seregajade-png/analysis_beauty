import { NextRequest, NextResponse } from "next/server";

const PROXY_SECRET = process.env.NEXTAUTH_SECRET;

export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const secret = req.headers.get("x-proxy-secret");
  if (!secret || secret !== PROXY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const path = params.path.join("/");
  const targetUrl = `https://api.openai.com/${path}`;

  try {
    // Forward raw body as-is — no FormData parsing, no corruption
    const rawBody = await req.arrayBuffer();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };

    // Preserve Content-Type (includes multipart boundary)
    const ct = req.headers.get("content-type");
    if (ct) headers["Content-Type"] = ct;

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: rawBody,
    });

    const data = await response.arrayBuffer();

    return new NextResponse(data, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Proxy error" }, { status: 500 });
  }
}
