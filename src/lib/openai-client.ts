import OpenAI from "openai";

const PROXY_URL = process.env.OPENAI_PROXY_URL;
const PROXY_SECRET = process.env.NEXTAUTH_SECRET;

export const openai = new OpenAI({
  apiKey: PROXY_URL ? "proxy" : process.env.OPENAI_API_KEY,
  baseURL: PROXY_URL
    ? `${PROXY_URL}/api/proxy-openai/v1`
    : undefined,
  defaultHeaders: PROXY_URL
    ? { "x-proxy-secret": PROXY_SECRET ?? "" }
    : undefined,
});
