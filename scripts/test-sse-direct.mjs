// Test: call the stream endpoint via browser-like fetch
// We'll test the SSE parsing logic with a mock response

import OpenAI from "openai";
import "dotenv/config";
import { createHash } from "crypto";

const BASE = "http://localhost:3002";

async function getAuthCookies() {
  // Step 1: Get the signin page to get CSRF token + cookies
  const signinRes = await fetch(`${BASE}/api/auth/signin`, {
    redirect: "manual",
  });
  const signinCookies = (signinRes.headers.getSetCookie?.() || [])
    .map(c => c.split(";")[0]);

  // Step 2: Get CSRF token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, {
    headers: { Cookie: signinCookies.join("; ") },
  });
  const { csrfToken } = await csrfRes.json();
  const csrfCookies = (csrfRes.headers.getSetCookie?.() || [])
    .map(c => c.split(";")[0]);

  const allCookies = [...new Set([...signinCookies, ...csrfCookies])];

  // Step 3: Login with credentials
  const body = new URLSearchParams({
    email: "admin@beauty-school.ru",
    password: "password123",
    csrfToken,
    redirect: "false",
    callbackUrl: BASE,
    json: "true",
  });

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: allCookies.join("; "),
    },
    body: body.toString(),
    redirect: "manual",
  });

  const loginCookies = (loginRes.headers.getSetCookie?.() || [])
    .map(c => c.split(";")[0]);

  const finalCookies = [...new Set([...allCookies, ...loginCookies])].join("; ");

  // Follow redirect if any
  const location = loginRes.headers.get("location");
  if (location) {
    const redirectUrl = location.startsWith("http") ? location : `${BASE}${location}`;
    const redirectRes = await fetch(redirectUrl, {
      headers: { Cookie: finalCookies },
      redirect: "manual",
    });
    const redirectCookies = (redirectRes.headers.getSetCookie?.() || [])
      .map(c => c.split(";")[0]);
    const afterRedirectCookies = [...new Set([
      ...allCookies,
      ...loginCookies,
      ...redirectCookies,
    ])].join("; ");
    return afterRedirectCookies;
  }

  return finalCookies;
}

async function main() {
  console.log("Getting auth cookies...");
  const cookies = await getAuthCookies();

  // Verify session
  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: cookies },
  });
  const session = await sessionRes.json();
  console.log("Session user:", session?.user?.email || "NO AUTH");

  if (!session?.user) {
    console.error("Auth failed. Testing without auth to check SSE...");

    // Try calling stream without auth to see what error we get
    const noAuthRes = await fetch(`${BASE}/api/chats/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "test", source: "TEXT" }),
    });
    console.log("No-auth response:", noAuthRes.status, await noAuthRes.text());
    return;
  }

  // Test stream
  console.log("\nTesting SSE stream...");
  const fd = new FormData();
  fd.append("text", `[Клиент]: Здравствуйте, сколько стоит маникюр?
[Администратор]: Здравствуйте! Классический маникюр 1500 руб, с покрытием гель-лаком 2500.
[Клиент]: Запишите на завтра
[Администратор]: На какое время? У нас есть 10:00 и 14:00.
[Клиент]: На 14
[Администратор]: Отлично, записала вас на 14:00! Адрес: ул. Ленина 15. Ждём вас!`);
  fd.append("source", "WHATSAPP");
  fd.append("adminName", "Тест");

  const res = await fetch(`${BASE}/api/chats/stream`, {
    method: "POST",
    headers: { Cookie: cookies },
    body: fd,
  });

  console.log("Response status:", res.status);
  console.log("Content-Type:", res.headers.get("content-type"));

  if (!res.ok) {
    console.error("Error:", await res.text());
    return;
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let chunkCount = 0;
  let accumulated = "";

  const startTime = Date.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });

    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";

    for (const part of parts) {
      const eventMatch = part.match(/^event: (\w+)/);
      const dataMatch = part.match(/\ndata: ([\s\S]+)$/);
      if (!eventMatch || !dataMatch) continue;

      const event = eventMatch[1];
      const payload = JSON.parse(dataMatch[1]);

      if (event === "chunk") {
        chunkCount++;
        accumulated += payload;
        if (chunkCount === 1) {
          console.log(`First chunk after ${Date.now() - startTime}ms`);
        }
        if (chunkCount % 50 === 0) {
          process.stdout.write(`[${chunkCount} chunks, ${accumulated.length} chars] `);
        }
      } else if (event === "done") {
        console.log(`\n\nDONE after ${Date.now() - startTime}ms`);
        console.log(`Total: ${chunkCount} chunks`);
        console.log("Score:", payload.result?.overallScore);
        console.log("Stages:", payload.result?.stages?.map(s => `${s.name}: ${s.score}`).join(", "));
      } else if (event === "error") {
        console.error("\nERROR:", payload);
      }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
