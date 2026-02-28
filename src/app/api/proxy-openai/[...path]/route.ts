import { NextRequest, NextResponse } from "next/server";

const PROXY_SECRET = process.env.NEXTAUTH_SECRET;

export const maxDuration = 300; // 5 minutes for long transcriptions

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
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const path = params.path.join("/");
  const targetUrl = `https://api.openai.com/${path}`;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };

    let body: BodyInit;
    if (isMultipart) {
      // Forward FormData as-is (for Whisper audio uploads)
      const formData = await req.formData();
      const newForm = new FormData();
      for (const [key, value] of formData.entries()) {
        newForm.append(key, value);
      }
      body = newForm;
    } else {
      headers["Content-Type"] = "application/json";
      body = await req.text();
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body,
    });

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    console.error("[PROXY-OPENAI] Error:", error);
    return NextResponse.json(
      { error: "Proxy error: " + String(error) },
      { status: 500 }
    );
  }
}
