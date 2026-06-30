import { useQuery } from '@tanstack/react-query'
import { API_BASE } from './config'

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export function useApiQuery<T>(key: (string | number)[], path: string, refetchInterval?: number) {
  return useQuery({ queryKey: key, queryFn: () => apiGet<T>(path), refetchInterval })
}

export const statementContentUrl = (id: string) => `${API_BASE}/api/statements/${id}/content`
