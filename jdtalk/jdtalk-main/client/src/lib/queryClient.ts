import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

type ApiRequestInit = Omit<RequestInit, "body"> & {
  body?: BodyInit | null;
  data?: unknown;
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response>;
export async function apiRequest(url: string, init?: ApiRequestInit): Promise<Response>;
export async function apiRequest(
  arg1: string,
  arg2: string | ApiRequestInit = {},
  arg3?: unknown,
): Promise<Response> {
  let url: string;
  let method: string;
  let init: ApiRequestInit;

  if (typeof arg2 === "string") {
    method = arg1;
    url = arg2;
    init = { data: arg3 };
  } else {
    url = arg1;
    init = arg2 ?? {};
    method = init.method ?? "GET";
  }

  const { data, headers: initHeaders, body: initBody, credentials, ...rest } = init;

  const headers = new Headers(initHeaders ?? undefined);
  let body = initBody ?? undefined;

  if (data !== undefined) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    body = JSON.stringify(data);
  }

  const res = await fetch(url, {
    ...rest,
    method,
    headers,
    body: body ?? undefined,
    credentials: credentials ?? "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Alterado para detectar quando o usuário volta à janela
      staleTime: 300000, // 5 minutos em vez de Infinity para permitir atualizações
      retry: 1, // Tenta uma vez mais em caso de falha
    },
    mutations: {
      retry: 1, // Tenta uma vez mais em caso de falha
    },
  },
});
