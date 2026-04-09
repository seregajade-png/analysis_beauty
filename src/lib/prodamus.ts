import crypto from "crypto";

const PRODAMUS_URL = process.env.PRODAMUS_URL ?? "https://nlisova.payform.ru/";
const PRODAMUS_SECRET = process.env.PRODAMUS_SECRET ?? "";

/**
 * Сортирует объект и считает HMAC-SHA256 как требует Prodamus.
 * Алгоритм: ksort всех полей рекурсивно → JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES → hash_hmac sha256.
 */
function ksort(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    const value = obj[key];
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      sorted[key] = ksort(value as Record<string, unknown>);
    } else {
      sorted[key] = value;
    }
  }
  return sorted;
}

export function signProdamus(data: Record<string, unknown>): string {
  const sorted = ksort(data);
  // Prodamus uses JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
  const json = JSON.stringify(sorted)
    .replace(/\\\//g, "/");
  return crypto.createHmac("sha256", PRODAMUS_SECRET).update(json, "utf8").digest("hex");
}

export function verifyProdamusSignature(data: Record<string, unknown>, signature: string): boolean {
  const { signature: _, ...payload } = data;
  void _;
  const expected = signProdamus(payload);
  return expected.toLowerCase() === signature.toLowerCase();
}

export interface ProdamusPaymentParams {
  orderId: string;
  amount: number;
  description: string;
  customerEmail: string;
  customerPhone?: string;
  successUrl?: string;
  webhookUrl: string;
}

/**
 * Строит URL оплаты Prodamus с подписью.
 */
export function buildProdamusPaymentUrl(params: ProdamusPaymentParams): string {
  const data: Record<string, string | number> = {
    order_id: params.orderId,
    "products[0][name]": params.description,
    "products[0][price]": params.amount,
    "products[0][quantity]": 1,
    customer_email: params.customerEmail,
    sys: "beautychief",
    do: "link",
    urlReturn: params.successUrl ?? "",
    urlSuccess: params.successUrl ?? "",
    urlNotification: params.webhookUrl,
    npd_income_type: "FROM_INDIVIDUAL",
  };

  if (params.customerPhone) {
    data.customer_phone = params.customerPhone;
  }

  // Подписываем
  const signature = signProdamus(data);
  data.signature = signature;

  // Строим query string
  const query = Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

  return `${PRODAMUS_URL}?${query}`;
}
