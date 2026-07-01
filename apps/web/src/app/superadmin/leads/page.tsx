'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

interface GlobalLead {
  id: string;
  name: string | null;
  phone: string | null;
  externalId: string | null;
  source: string;
  temperature: 'COLD' | 'WARM' | 'HOT';
  appointmentBooked: boolean;
  appointmentStatus: string | null;
  updatedAt: string;
  client: { id: string; name: string };
}

interface LeadsData {
  leads: GlobalLead[];
  total: number;
  page: number;
  totalPages: number;
}

const TEMPERATURE_LABELS: Record<string, string> = { COLD: 'Frío', WARM: 'Tibio', HOT: 'Caliente' };
const TEMPERATURE_BADGE: Record<string, 'default' | 'warning' | 'danger'> = { COLD: 'default', WARM: 'warning', HOT: 'danger' };
const CHANNEL_ICONS: Record<string, string> = { WHATSAPP: '📱', INSTAGRAM: '📸', WEBCHAT: '🌐' };

export default function GlobalLeadsPage() {
  const [data, setData] = useState<LeadsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filter) params.set('temperature', filter);
      const { data: res } = await api.get(`/admin/overview/leads?${params}`);
      setData(res.data);
    } catch {
      toast.error('Error al cargar los leads');
    } finally {
      setIsLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">Leads globales</h1>
        <p className="text-dark-500 mt-1">Todos los leads de todos los clientes</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { value: '', label: 'Todos', emoji: '📋' },
          { value: 'COLD', label: 'Frío', emoji: '🔵' },
          { value: 'WARM', label: 'Tibio', emoji: '🟠' },
          { value: 'HOT', label: 'Caliente', emoji: '🔴' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setFilter(opt.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === opt.value ? 'bg-primary-500 text-white' : 'bg-white border border-dark-200 text-dark-600 hover:bg-dark-50'
            }`}
          >
            {opt.emoji} {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data || data.leads.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold text-dark-800 mb-2">No hay leads aún</h3>
          <p className="text-dark-400 text-sm">Aparecerán aquí cuando los clientes reciban contactos</p>
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
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Temperatura</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Cita</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Última actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {data.leads.map((lead) => {
                  const leadName = lead.name || lead.phone || lead.externalId?.slice(0, 12) || 'Sin nombre';
                  return (
                    <tr key={lead.id} className="hover:bg-dark-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-dark-900">{lead.client.name}</td>
                      <td className="px-5 py-4 text-sm text-dark-600">{leadName}</td>
                      <td className="px-5 py-4 text-sm text-dark-600">
                        {CHANNEL_ICONS[lead.source] || ''} {lead.source}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={TEMPERATURE_BADGE[lead.temperature]}>{TEMPERATURE_LABELS[lead.temperature]}</Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-dark-600">
                        {lead.appointmentBooked ? '📅 Agendado' : '—'}
                      </td>
                      <td className="px-5 py-4 text-sm text-dark-600">{formatDate(lead.updatedAt)}</td>
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
