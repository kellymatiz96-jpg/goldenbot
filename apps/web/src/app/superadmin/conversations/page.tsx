'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

interface GlobalConversation {
  id: string;
  status: 'BOT_ACTIVE' | 'AGENT_ACTIVE' | 'CLOSED';
  lastMessageAt: string | null;
  createdAt: string;
  client: { id: string; name: string };
  lead: { id: string; name: string | null; phone: string | null; externalId: string | null };
  channel: { type: string };
}

interface ConversationsData {
  conversations: GlobalConversation[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_LABEL: Record<string, string> = {
  BOT_ACTIVE: '🤖 Bot',
  AGENT_ACTIVE: '🎧 Agente',
  CLOSED: '🔒 Cerrada',
};

const STATUS_BADGE: Record<string, 'default' | 'warning' | 'success'> = {
  BOT_ACTIVE: 'default',
  AGENT_ACTIVE: 'warning',
  CLOSED: 'success',
};

const CHANNEL_ICONS: Record<string, string> = {
  WHATSAPP: '📱',
  INSTAGRAM: '📸',
  WEBCHAT: '🌐',
};

export default function GlobalConversationsPage() {
  const [data, setData] = useState<ConversationsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: res } = await api.get(`/admin/overview/conversations?page=${page}`);
      setData(res.data);
    } catch {
      toast.error('Error al cargar las conversaciones');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">Conversaciones globales</h1>
        <p className="text-dark-500 mt-1">Supervisa las conversaciones de todos los clientes (solo lectura)</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data || data.conversations.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">💬</div>
          <h3 className="text-lg font-semibold text-dark-800 mb-2">No hay conversaciones aún</h3>
          <p className="text-dark-400 text-sm">Aparecerán aquí cuando los clientes reciban mensajes</p>
        </div>
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-100 bg-dark-50">
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Lead</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Canal</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Estado</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Última actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {data.conversations.map((conv) => {
                  const leadName = conv.lead.name || conv.lead.phone || conv.lead.externalId?.slice(0, 12) || 'Sin nombre';
                  return (
                    <tr key={conv.id} className="hover:bg-dark-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-dark-900">{conv.client.name}</td>
                      <td className="px-5 py-4 text-sm text-dark-600">{leadName}</td>
                      <td className="px-5 py-4 text-sm text-dark-600">
                        {CHANNEL_ICONS[conv.channel.type] || ''} {conv.channel.type}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={STATUS_BADGE[conv.status]}>{STATUS_LABEL[conv.status]}</Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-dark-600">{formatDate(conv.lastMessageAt)}</td>
                    </tr>
                  );
                })}
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
