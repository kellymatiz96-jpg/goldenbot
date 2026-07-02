'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

interface AccessLog {
  id: string;
  mode: 'LIMITED' | 'SUPPORT';
  createdAt: string;
  client: { id: string; name: string };
  admin: { id: string; name: string; email: string };
  grant: { reason: string | null; initiatedBy: 'ADMIN' | 'CLIENT' } | null;
}

interface LogsData {
  logs: AccessLog[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AuditLogPage() {
  const [data, setData] = useState<LogsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: res } = await api.get(`/admin/support-access/logs?page=${page}`);
      setData(res.data);
    } catch {
      toast.error('Error al cargar la auditoría de accesos');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">Auditoría de accesos</h1>
        <p className="text-dark-500 mt-1">Cada vez que un administrador entra a la cuenta de un cliente, queda registrado aquí</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data || data.logs.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🗂️</div>
          <h3 className="text-lg font-semibold text-dark-800 mb-2">Sin accesos registrados</h3>
          <p className="text-dark-400 text-sm">Aparecerán aquí cada vez que un admin entre al panel de un cliente</p>
        </div>
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-100 bg-dark-50">
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Administrador</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Modo</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Motivo</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-dark-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-dark-900">{log.admin.name}</p>
                      <p className="text-xs text-dark-400">{log.admin.email}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-dark-600">{log.client.name}</td>
                    <td className="px-5 py-4">
                      <Badge variant={log.mode === 'SUPPORT' ? 'warning' : 'default'}>
                        {log.mode === 'SUPPORT' ? '🔓 Soporte' : '🔒 Limitado'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-dark-500 italic">{log.grant?.reason || '—'}</td>
                    <td className="px-5 py-4 text-sm text-dark-600">{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pb-4">
              <p className="text-sm text-dark-400">Página {data.page} de {data.totalPages}</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm border border-dark-200 rounded-lg disabled:opacity-40 hover:bg-dark-50">← Anterior</button>
                <button disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm border border-dark-200 rounded-lg disabled:opacity-40 hover:bg-dark-50">Siguiente →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
