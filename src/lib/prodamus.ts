import crypto from "crypto";

const PRODAMUS_URL = process.env.PRODAMUS_URL ?? "https://nlisova.payform.ru/";
const PRODAMUS_SECRET = process.env.PRODAMUS_SECRET ?? "";

/**
 * Prodamus signing algorithm (from official python-prodamus library):
 * 1. Convert flat PHP-style keys (products[0][name]) into nested dict
 * 2. JSON.stringify with sorted keys, no spaces, no ascii escaping
 * 3. HMAC-SHA256 with secret key
 */

// Convert flat PHP-style keys to nested object
// e.g. {"products[0][name]": "X"} → {products: {"0": {name: "X"}}}
function phpToDict(flat: Record<string, string | number>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    const match = key.match(/^([^\[]+)((?:\[[^\]]+\])*)$/);
    if (!match || !match[2]) {
      result[key] = String(value);
      continue;
    }

    const parts = [match[1], ...match[2].match(/\[([^\]]+)\]/g)!.map(s => s.slice(1, -1))];
    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = String(value);
  }

  return result;
}

// Sort object keys recursively (like Python's sort_keys=True)
function sortKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

// Compact JSON like Python's json.dumps(data, ensure_ascii=False, separators=(',',':'), sort_keys=True)
function compactJson(data: unknown): string {
  const sorted = sortKeys(data);
  return JSON.stringify(sorted);
}

export function signProdamus(data: Record<string, unknown>): string {
  const json = compactJson(data);
  return crypto.createHmac("sha256", PRODAMUS_SECRET).update(json, "utf8").digest("hex");
}

export function verifyProdamusSignature(body: string): boolean {
  // Parse PHP-style form body to nested dict
  const params = new URLSearchParams(body);
  const flat: Record<string, string> = {};
  let receivedSign = "";

  for (const [key, value] of params.entries()) {
    if (key === "signature") {
      receivedSign = value;
    } else {
      flat[key] = value;
    }
  }

  const nested = phpToDict(flat);
  const expected = signProdamus(nested);
  return expected.toLowerCase() === receivedSign.toLowerCase();
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
 * Build Prodamus payment URL with signed link.
 */
export function buildProdamusPaymentUrl(params: ProdamusPaymentParams): string {
  // Build flat params (PHP-style keys for products array)
  const flat: Record<string, string | number> = {
    order_id: params.orderId,
    "products[0][name]": params.description,
    "products[0][price]": params.amount,
    "products[0][quantity]": "1",
    customer_email: params.customerEmail,
    do: "pay",
    urlReturn: params.successUrl ?? "",
    urlSuccess: params.successUrl ?? "",
    urlNotification: params.webhookUrl,
  };

  if (params.customerPhone) {
    flat.customer_phone = params.customerPhone;
  }

  // Build query string — Prodamus does NOT require signature for payment links
  // Signature is only used for webhook verification
  const query = Object.entries(flat)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

  return `${PRODAMUS_URL}?${query}`;
}
