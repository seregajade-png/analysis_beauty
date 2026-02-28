// Test streaming endpoint
import { createHash } from "crypto";

const BASE = "http://localhost:3002";

async function main() {
  // 1. Get CSRF token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const cookies = csrfRes.headers.getSetCookie?.() || [];
  console.log("CSRF token:", csrfToken);
  console.log("Initial cookies:", cookies.length);

  // 2. Login
  const loginBody = new URLSearchParams({
    email: "admin@beauty.ru",
    password: "password123",
    redirect: "false",
    callbackUrl: BASE,
    csrfToken,
    json: "true",
  });

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies.map(c => c.split(";")[0]).join("; "),
    },
    body: loginBody.toString(),
    redirect: "manual",
  });

  console.log("Login status:", loginRes.status);
  const loginCookies = loginRes.headers.getSetCookie?.() || [];
  const allCookies = [...cookies, ...loginCookies].map(c => c.split(";")[0]).join("; ");
  console.log("Session cookies:", allCookies.substring(0, 100) + "...");

  // 3. Test session
  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: allCookies },
  });
  const session = await sessionRes.json();
  console.log("Session:", JSON.stringify(session).substring(0, 200));

  if (!session?.user) {
    console.error("AUTH FAILED - no session user");
    process.exit(1);
  }

  // 4. Test streaming endpoint
  console.log("\n--- Testing /api/chats/stream ---");
  const fd = new FormData();
  fd.append("text", `[Клиент]: Здравствуйте, сколько стоит ботокс для волос?
[Администратор]: Здравствуйте! Ботокс для волос у нас стоит 3500 руб.
[Клиент]: А долго длится процедура?
[Администратор]: Около 1.5 часов. Когда вам удобно записаться?
[Клиент]: А есть скидки?
[Администратор]: Да, при первом посещении скидка 10%. Давайте запишу вас на удобное время?`);
  fd.append("source", "WHATSAPP");
  fd.append("adminName", "Тест");
  fd.append("title", "Тестовая переписка");

  const streamRes = await fetch(`${BASE}/api/chats/stream`, {
    method: "POST",
    headers: { Cookie: allCookies },
    body: fd,
  });

  console.log("Stream status:", streamRes.status);
  console.log("Stream content-type:", streamRes.headers.get("content-type"));

  if (!streamRes.ok) {
    const text = await streamRes.text();
    console.error("Stream error:", text);
    process.exit(1);
  }

  const reader = streamRes.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let chunkCount = 0;

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

      if (event === "chunk") {
        chunkCount++;
        if (chunkCount <= 5 || chunkCount % 20 === 0) {
          process.stdout.write(`[chunk ${chunkCount}] `);
        }
      } else if (event === "done") {
        const payload = JSON.parse(dataMatch[1]);
        console.log(`\n\nDONE! Total chunks: ${chunkCount}`);
        console.log("Record ID:", payload.id);
        console.log("Overall score:", payload.result?.overallScore);
        console.log("Stages:", payload.result?.stages?.length);
      } else if (event === "error") {
        console.error("\nERROR:", dataMatch[1]);
      }
    }
  }

  console.log("\nStream test completed.");
}

main().catch(e => { console.error(e); process.exit(1); });
