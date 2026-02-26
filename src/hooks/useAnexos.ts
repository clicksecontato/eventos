import { useState, useEffect, useCallback } from 'react';
import { AnexoEvento } from '@/types';
import { useCurrentUser } from './useAuth';

interface UseAnexosResult {
  anexos: AnexoEvento[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAnexos(eventoId: string): UseAnexosResult {
  const [anexos, setAnexos] = useState<AnexoEvento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchAnexos = useCallback(async () => {
    if (!eventoId || !userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/arquivos?eventoId=${eventoId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar anexos');
      }

      // A API retorna { data: { success: true, arquivos: [...] } } via createApiResponse
      const data = result.data || result;
      const arquivos = data?.arquivos || [];
      
      if (data?.success || result.success) {
        // Converter datas de string para Date se necessário
        const anexosConvertidos = arquivos.map((anexo: any) => ({
          ...anexo,
          dataUpload: anexo.dataUpload instanceof Date 
            ? anexo.dataUpload 
            : anexo.dataUpload 
              ? new Date(anexo.dataUpload) 
              : new Date()
        }));
        setAnexos(anexosConvertidos);
      } else {
        throw new Error(data?.error || result.error || 'Erro ao carregar anexos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar anexos');
    } finally {
      setLoading(false);
    }
  }, [eventoId, userId]);

  useEffect(() => {
    fetchAnexos();
  }, [fetchAnexos]);

  return { anexos, loading, error, refetch: fetchAnexos };
}
