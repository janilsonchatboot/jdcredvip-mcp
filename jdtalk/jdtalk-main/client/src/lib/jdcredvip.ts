const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

const getStoredAccessToken = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("auth_tokens");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string; expiresAt?: number };
    if (!parsed.token) return null;
    if (parsed.expiresAt && parsed.expiresAt <= Date.now()) {
      return null;
    }
    return parsed.token as string;
  } catch (_error) {
    return null;
  }
};

const normalizeUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const base = BASE_URL.replace(/\/$/, "");
  const cleanedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanedPath}`;
};

type FetchOptions = RequestInit & { data?: unknown };

export async function backendFetch(path: string, options: FetchOptions = {}) {
  const { headers, data, body, ...rest } = options;
  const initHeaders = new Headers(headers ?? undefined);
  let requestBody = body;

  if (typeof window !== "undefined") {
    const storedRole = window.localStorage.getItem("auth_role");
    if (storedRole && !initHeaders.has("x-user-role")) {
      initHeaders.set("x-user-role", storedRole);
    }
  }
  if (!initHeaders.has("Authorization")) {
    const token = getStoredAccessToken();
    if (token) {
      initHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  if (data !== undefined) {
    if (!initHeaders.has("Content-Type")) {
      initHeaders.set("Content-Type", "application/json");
    }
    requestBody = JSON.stringify(data);
  }

  const response = await fetch(normalizeUrl(path), {
    ...rest,
    headers: initHeaders,
    body: requestBody,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `${response.status} ${response.statusText}`);
  }

  return response;
}

export async function backendJson<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const response = await backendFetch(path, options);
  const body = await response.json();
  if (body && typeof body === "object" && "dados" in body) {
    return (body.dados ?? null) as T;
  }
  return body as T;
}

export async function backendPostJson<T>(path: string, payload: unknown): Promise<T> {
  return backendJson<T>(path, {
    method: "POST",
    data: payload,
  });
}

export async function backendPutJson<T>(path: string, payload: unknown): Promise<T> {
  return backendJson<T>(path, {
    method: "PUT",
    data: payload,
  });
}

export async function backendDelete(path: string): Promise<void> {
  await backendFetch(path, {
    method: "DELETE",
  });
}
