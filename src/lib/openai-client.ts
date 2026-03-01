import OpenAI from "openai";

const PROXY_URL = process.env.OPENAI_PROXY_URL;

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: PROXY_URL ? `${PROXY_URL}/v1` : undefined,
});
