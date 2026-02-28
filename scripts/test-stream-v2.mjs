import "dotenv/config";

const BASE = "http://localhost:3002";

async function getAuthCookies() {
  const signinRes = await fetch(`${BASE}/api/auth/signin`, { redirect: "manual" });
  const signinCookies = (signinRes.headers.getSetCookie?.() || []).map(c => c.split(";")[0]);

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, {
    headers: { Cookie: signinCookies.join("; ") },
  });
  const { csrfToken } = await csrfRes.json();
  const csrfCookies = (csrfRes.headers.getSetCookie?.() || []).map(c => c.split(";")[0]);
  const allCookies = [...new Set([...signinCookies, ...csrfCookies])];

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: allCookies.join("; ") },
    body: new URLSearchParams({
      email: "admin@beauty-school.ru", password: "password123",
      csrfToken, redirect: "false", callbackUrl: BASE, json: "true",
    }).toString(),
    redirect: "manual",
  });

  const loginCookies = (loginRes.headers.getSetCookie?.() || []).map(c => c.split(";")[0]);
  const location = loginRes.headers.get("location");
  let finalCookies = [...new Set([...allCookies, ...loginCookies])];

  if (location) {
    const url = location.startsWith("http") ? location : `${BASE}${location}`;
    const rRes = await fetch(url, { headers: { Cookie: finalCookies.join("; ") }, redirect: "manual" });
    const rCookies = (rRes.headers.getSetCookie?.() || []).map(c => c.split(";")[0]);
    finalCookies = [...new Set([...finalCookies, ...rCookies])];
  }

  return finalCookies.join("; ");
}

const cookies = await getAuthCookies();
const sRes = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookies } });
const session = await sRes.json();
console.log("Auth:", session?.user?.email || "FAILED");
if (!session?.user) process.exit(1);

console.log("\nStreaming test...");
const fd = new FormData();
fd.append("text", "[Клиент]: Добрый день, хочу записаться на маникюр\n[Администратор]: Здравствуйте! Какой маникюр вас интересует?\n[Клиент]: Классический с покрытием\n[Администратор]: Отлично! Стоимость 2500 руб. Когда удобно?");
fd.append("source", "WHATSAPP");
fd.append("adminName", "Тест");

const t0 = Date.now();
const res = await fetch(`${BASE}/api/chats/stream`, {
  method: "POST",
  headers: { Cookie: cookies },
  body: fd,
});

console.log("Status:", res.status, "Type:", res.headers.get("content-type"));

const reader = res.body.getReader();
const dec = new TextDecoder();
let buf = "", chunks = 0;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  const parts = buf.split("\n\n");
  buf = parts.pop() ?? "";

  for (const part of parts) {
    const em = part.match(/^event: (\w+)/);
    const dm = part.match(/\ndata: ([\s\S]+)$/);
    if (!em || !dm) continue;
    if (em[1] === "chunk") {
      chunks++;
      if (chunks === 1) console.log(`First chunk: ${Date.now() - t0}ms`);
      if (chunks % 100 === 0) process.stdout.write(`[${chunks}] `);
    } else if (em[1] === "done") {
      const p = JSON.parse(dm[1]);
      console.log(`\nDONE: ${Date.now() - t0}ms, ${chunks} chunks, score=${p.result?.overallScore}`);
    } else if (em[1] === "error") {
      console.error("\nERROR:", dm[1]);
    }
  }
}
console.log("Finished.");
