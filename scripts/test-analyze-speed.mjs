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

console.log("\nTesting /api/chats/analyze (optimized)...");
const t0 = Date.now();
const fd = new FormData();
fd.append("text", `[Клиент]: Добрый день, хочу записаться на маникюр
[Администратор]: Здравствуйте! Какой маникюр вас интересует?
[Клиент]: Классический с покрытием
[Администратор]: Отлично! Стоимость 2500 руб. Когда удобно?
[Клиент]: Завтра на 14:00
[Администратор]: Записала вас на завтра в 14:00. Ждём!`);
fd.append("source", "WHATSAPP");
fd.append("adminName", "Тест");

const res = await fetch(`${BASE}/api/chats/analyze`, {
  method: "POST",
  headers: { Cookie: cookies },
  body: fd,
});

const elapsed = Date.now() - t0;
console.log("Status:", res.status, "Time:", elapsed + "ms");

if (res.ok) {
  const data = await res.json();
  console.log("Score:", data.result?.overallScore);
  console.log("Summary:", data.result?.summary);
  console.log("Stages:", data.result?.stages?.length);
  console.log("Messages:", data.result?.messageAnalysis?.length);
} else {
  console.log("Error:", await res.text());
}
