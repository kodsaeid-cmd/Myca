import "server-only";

export type SupabaseConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export class BackendNotConfiguredError extends Error {
  constructor() {
    super("MYCA backend environment is not configured.");
    this.name = "BackendNotConfiguredError";
  }
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !anonKey || !serviceRoleKey) return null;
  return { url, anonKey, serviceRoleKey };
}

export function requireSupabaseConfig(): SupabaseConfig {
  const config = getSupabaseConfig();
  if (!config) throw new BackendNotConfiguredError();
  return config;
}

export async function supabaseAuthFetch(path: string, init: RequestInit = {}) {
  const config = requireSupabaseConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", config.anonKey);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(`${config.url}/auth/v1${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });
}

export async function supabaseAdminFetch(path: string, init: RequestInit = {}) {
  const config = requireSupabaseConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", config.serviceRoleKey);
  headers.set("authorization", `Bearer ${config.serviceRoleKey}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });
}

export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ascii = value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  const compact = ascii.trim().replace(/[\s().-]/g, "");
  if (/^09\d{9}$/.test(compact)) return `+98${compact.slice(1)}`;
  if (/^9\d{9}$/.test(compact)) return `+98${compact}`;
  if (/^989\d{9}$/.test(compact)) return `+${compact}`;
  if (/^00989\d{9}$/.test(compact)) return `+${compact.slice(2)}`;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  return null;
}

export async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json() as T;
  } catch {
    return null;
  }
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
