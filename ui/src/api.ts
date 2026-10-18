import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "./config.ts";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `${method} ${path}: HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const apiGet = <T>(path: string) => request<T>("GET", path);

export const apiPost = <T>(path: string, body?: unknown) => request<T>("POST", path, body);

export const apiPut = <T>(path: string, body?: unknown) => request<T>("PUT", path, body);

export function useApiQuery<T>(queryKey: string[], path: string, refetchInterval?: number) {
  return useQuery({ queryKey, queryFn: () => apiGet<T>(path), refetchInterval });
}

export const statementContentUrl = (id: string) => `${API_BASE}/api/statements/${id}/content`;
