export const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export const getHeaders = async (): Promise<HeadersInit> => ({ 'Content-Type': 'application/json' })

export const bankUrl = `${window.location.origin}/ebicsweb/ebicsweb`
