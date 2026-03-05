export interface ApiClientErrorPayload {
  error?: string;
  message?: string;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly payload?: ApiClientErrorPayload;

  constructor(message: string, status: number, payload?: ApiClientErrorPayload) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.payload = payload;
  }
}

export function extrairDataResposta<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    ...init
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const erro = payload as ApiClientErrorPayload;
    throw new ApiClientError(
      erro.error || erro.message || `Erro ao chamar ${url}`,
      response.status,
      erro
    );
  }

  return extrairDataResposta<T>(payload);
}
