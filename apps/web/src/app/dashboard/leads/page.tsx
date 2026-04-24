'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  externalId: string;
  source: string;
  temperature: 'COLD' | 'WARM' | 'HOT';
  appointmentBooked: boolean;
  appointmentBookedAt: string | null;
  appointmentNotes: string | null;
  appointmentStatus: 'PENDING' | 'ATTENDED' | 'CANCELLED' | null;
  createdAt: string;
  updatedAt: string;
  conversations: Array<{
    id: string;
    status: string;
    lastMessageAt: string;
    channel: { type: string };
  }>;
}

interface LeadsData {
  leads: Lead[];
  total: number;
  page: number;
  totalPages: number;
}

const TEMPERATURE_LABELS: Record<string, string> = {
  COLD: 'Frío',
  WARM: 'Tibio',
  HOT: 'Caliente',
};

const TEMPERATURE_BADGE: Record<string, 'default' | 'warning' | 'danger'> = {
  COLD: 'default',
  WARM: 'warning',
  HOT: 'danger',
};

const CHANNEL_ICONS: Record<string, string> = {
  WHATSAPP: '📱',
  INSTAGRAM: '📸',
  WEBCHAT: '🌐',
};

export default function LeadsPage() {
  const router = useRouter();
  const [data, setData] = useState<LeadsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [showHistory, setShowHistory] = useState(false);

  const fetchLeads = useCallback(async () => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filter === 'BOOKED') {
        params.set('appointmentBooked', 'true');
        params.set('appointmentStatus', showHistory ? 'HISTORY' : 'PENDING');
      } else if (filter) {
        params.set('temperature', filter);
      }
      if (search) params.set('search', search);
      const { data: res } = await api.get(`/leads?${params}`);
      setData(res.data);
    } catch {
      toast.error('Error al cargar los leads');
    } finally {
      setIsLoading(false);
    }
  }, [page, filter, search, showHistory]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const changeTemperature = async (lead: Lead, temperature: 'COLD' | 'WARM' | 'HOT') => {
    try {
      await api.patch(`/leads/${lead.id}/temperature`, { temperature });
      toast.success(`Lead actualizado a ${TEMPERATURE_LABELS[temperature]}`);
      fetchLeads();
    } catch {
      toast.error('Error al actualizar la temperatura');
    }
  };

  const saveNotes = async (lead: Lead, notes: string) => {
    try {
      await api.patch(`/leads/${lead.id}/appointment-notes`, { notes });
      toast.success('Notas guardadas');
      fetchLeads();
    } catch {
      toast.error('Error al guardar notas');
    }
  };

  const unbook = async (lead: Lead) => {
    const conv = lead.conversations[0];
    if (!conv) return;
    try {
      await api.put(`/conversations/${conv.id}/appointment-booked`, { booked: false });
      toast.success('Cita desmarcada');
      fetchLeads();
    } catch {
      toast.error('Error al desmarcar');
    }
  };

  const markStatus = async (lead: Lead, status: 'ATTENDED' | 'CANCELLED') => {
    try {
      await api.patch(`/leads/${lead.id}/appointment-status`, { status });
      toast.success(status === 'ATTENDED' ? '✓ Marcado como atendido' : 'Cita cancelada');
      fetchLeads();
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const goToConversation = (lead: Lead) => {
    const conv = lead.conversations[0];
    if (conv) {
      router.push(`/dashboard/conversations?id=${conv.id}`);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">Leads</h1>
        <p className="text-dark-500 mt-1">
          Todos los contactos que han interactuado con tu chatbot
        </p>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Filtro de temperatura */}
        <div className="flex gap-2">
          {[
            { value: '', label: 'Todos', emoji: '📋' },
            { value: 'COLD', label: 'Frío', emoji: '🔵' },
            { value: 'WARM', label: 'Tibio', emoji: '🟠' },
            { value: 'HOT', label: 'Caliente', emoji: '🔴' },
            { value: 'BOOKED', label: 'Agendados', emoji: '📅' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setFilter(opt.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-dark-200 text-dark-600 hover:bg-dark-50'
              }`}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 sm:max-w-xs">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="input flex-1 text-sm"
          />
          <button type="submit" className="btn-primary text-sm px-3">
            Buscar
          </button>
        </form>
      </div>

      {/* Total */}
      {data && (
        <p className="text-sm text-dark-400 mb-4">
          {data.total} lead{data.total !== 1 ? 's' : ''} encontrado{data.total !== 1 ? 's' : ''}
        </p>
      )}

      {/* Lista de leads */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data || data.leads.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">🎯</div>
          <h3 className="font-semibold text-dark-800 mb-2">No hay leads aún</h3>
          <p className="text-dark-400 text-sm">Los leads aparecen aquí cuando alguien escribe a tu chatbot</p>
        </div>
      ) : filter === 'BOOKED' ? (
        /* Vista especial para Agendados */
        <>
          {/* Toggle pendientes / historial */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => { setShowHistory(false); setPage(1); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${!showHistory ? 'bg-primary-500 text-white' : 'bg-white border border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >
              📅 Pendientes
            </button>
            <button
              onClick={() => { setShowHistory(true); setPage(1); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${showHistory ? 'bg-primary-500 text-white' : 'bg-white border border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >
              🗂️ Historial
            </button>
          </div>

          {data.leads.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-3">{showHistory ? '🗂️' : '📅'}</div>
              <h3 className="font-semibold text-dark-800 mb-2">
                {showHistory ? 'No hay citas en el historial' : 'No hay citas pendientes'}
              </h3>
              <p className="text-dark-400 text-sm">
                {showHistory ? 'Las citas atendidas y canceladas aparecerán aquí' : 'Las citas aparecen aquí cuando marcas un lead como agendado'}
              </p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-100 bg-dark-50">
                    <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Lead</th>
                    <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Canal</th>
                    <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3 w-64">Notas de cita</th>
                    <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Fecha agendado</th>
                    <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                  {data.leads.map((lead) => {
                    const conv = lead.conversations[0];
                    const displayName = lead.name || lead.phone || lead.externalId.slice(0, 12) + '...';
                    return (
                      <BookedLeadRow
                        key={lead.id}
                        lead={lead}
                        displayName={displayName}
                        conv={conv}
                        isHistory={showHistory}
                        onSaveNotes={saveNotes}
                        onUnbook={unbook}
                        onMarkStatus={markStatus}
                        onGoToConversation={goToConversation}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Tarjetas móvil */}
          <div className="flex flex-col gap-3 md:hidden pb-8">
            {data.leads.map((lead) => {
              const conv = lead.conversations[0];
              const displayName = lead.name || lead.phone || lead.externalId.slice(0, 16) + '...';
              return (
                <div key={lead.id} className="card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 flex-shrink-0">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-dark-900 truncate">{displayName}</p>
                      {lead.phone && lead.name && <p className="text-xs text-dark-400">{lead.phone}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={TEMPERATURE_BADGE[lead.temperature]}>
                        {TEMPERATURE_LABELS[lead.temperature]}
                      </Badge>
                      {lead.appointmentBooked && <Badge variant="success">📅 Agendado</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-dark-500">
                    <span>{CHANNEL_ICONS[conv?.channel?.type || lead.source]} {conv?.channel?.type || lead.source}</span>
                    <span>{conv?.lastMessageAt ? formatDate(conv.lastMessageAt) : formatDate(lead.updatedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-100">
                    <select
                      value={lead.temperature}
                      onChange={(e) => changeTemperature(lead, e.target.value as 'COLD' | 'WARM' | 'HOT')}
                      className="text-xs border border-dark-200 rounded px-2 py-1 text-dark-600 bg-white"
                    >
                      <option value="COLD">Frío</option>
                      <option value="WARM">Tibio</option>
                      <option value="HOT">Caliente</option>
                    </select>
                    {conv ? (
                      <button onClick={() => goToConversation(lead)} className="text-xs font-medium text-primary-600">
                        Ver conversación →
                      </button>
                    ) : (
                      <span className="text-xs text-dark-400">Sin conversación</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabla desktop */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-100 bg-dark-50">
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Lead</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Canal</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Temperatura</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Última actividad</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {data.leads.map((lead) => {
                  const conv = lead.conversations[0];
                  const displayName = lead.name || lead.phone || lead.externalId.slice(0, 12) + '...';
                  return (
                    <tr key={lead.id} className="hover:bg-dark-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 flex-shrink-0">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-dark-900">{displayName}</p>
                            {lead.phone && lead.name && <p className="text-xs text-dark-400">{lead.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-dark-600">
                          {CHANNEL_ICONS[conv?.channel?.type || lead.source]} {conv?.channel?.type || lead.source}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={TEMPERATURE_BADGE[lead.temperature]}>{TEMPERATURE_LABELS[lead.temperature]}</Badge>
                          {lead.appointmentBooked && <Badge variant="success">📅</Badge>}
                          <select
                            value={lead.temperature}
                            onChange={(e) => changeTemperature(lead, e.target.value as 'COLD' | 'WARM' | 'HOT')}
                            className="text-xs border border-dark-200 rounded px-1 py-0.5 text-dark-600 bg-white"
                          >
                            <option value="COLD">Frío</option>
                            <option value="WARM">Tibio</option>
                            <option value="HOT">Caliente</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-dark-600">
                          {conv?.lastMessageAt ? formatDate(conv.lastMessageAt) : formatDate(lead.updatedAt)}
                        </p>
                        {conv && <p className="text-xs text-dark-400">{conv.status === 'AGENT_ACTIVE' ? '🎧 Con agente' : '🤖 Con bot'}</p>}
                      </td>
                      <td className="px-5 py-4">
                        {conv ? (
                          <button onClick={() => goToConversation(lead)} className="text-xs font-medium text-primary-600 hover:text-primary-800">
                            Ver conversación →
                          </button>
                        ) : (
                          <span className="text-xs text-dark-400">Sin conversación</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
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

function BookedLeadRow({
  lead, displayName, conv, isHistory, onSaveNotes, onUnbook, onMarkStatus, onGoToConversation,
}: {
  lead: Lead;
  displayName: string;
  conv: Lead['conversations'][0] | undefined;
  isHistory: boolean;
  onSaveNotes: (lead: Lead, notes: string) => Promise<void>;
  onUnbook: (lead: Lead) => Promise<void>;
  onMarkStatus: (lead: Lead, status: 'ATTENDED' | 'CANCELLED') => Promise<void>;
  onGoToConversation: (lead: Lead) => void;
}) {
  const [notes, setNotes] = useState(lead.appointmentNotes || '');
  const [editing, setEditing] = useState(false);

  const bookedDate = lead.appointmentBookedAt
    ? new Date(lead.appointmentBookedAt).toLocaleString('es-ES', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const statusBadge = lead.appointmentStatus === 'ATTENDED'
    ? <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Atendido</span>
    : lead.appointmentStatus === 'CANCELLED'
    ? <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">✗ Cancelado</span>
    : null;

  return (
    <tr className="hover:bg-dark-50 transition-colors">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isHistory ? 'bg-dark-100 text-dark-500' : 'bg-green-100 text-green-700'}`}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-dark-900">{displayName}</p>
            {lead.phone && lead.name && <p className="text-xs text-dark-400">{lead.phone}</p>}
            {statusBadge}
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="text-sm text-dark-600">{CHANNEL_ICONS[conv?.channel?.type || lead.source]} {conv?.channel?.type || lead.source}</span>
      </td>
      <td className="px-5 py-4">
        {editing ? (
          <div className="flex gap-1">
            <input
              autoFocus
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { onSaveNotes(lead, notes); setEditing(false); }
                if (e.key === 'Escape') setEditing(false);
              }}
              placeholder="Ej: Depilación laser — Lunes 10am"
              className="input text-xs flex-1"
            />
            <button onClick={() => { onSaveNotes(lead, notes); setEditing(false); }} className="text-xs px-2 py-1 bg-primary-500 text-white rounded">✓</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-left group w-full">
            <p className="text-sm text-dark-700 group-hover:text-primary-600 transition-colors">
              {notes || <span className="text-dark-300 italic">Agregar notas...</span>}
            </p>
          </button>
        )}
      </td>
      <td className="px-5 py-4">
        <p className="text-sm text-dark-700 font-medium">📅 {bookedDate}</p>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          {conv && (
            <button onClick={() => onGoToConversation(lead)} className="text-xs font-medium text-primary-600 hover:text-primary-800">
              Ver chat →
            </button>
          )}
          {!isHistory && (
            <>
              <button
                onClick={() => onMarkStatus(lead, 'ATTENDED')}
                className="text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2 py-1 rounded transition-colors"
              >
                ✓ Atendido
              </button>
              <button
                onClick={() => onMarkStatus(lead, 'CANCELLED')}
                className="text-xs text-dark-400 hover:text-red-500 transition-colors"
              >
                ✗ Cancelar
              </button>
            </>
          )}
          {!isHistory && (
            <button onClick={() => onUnbook(lead)} className="text-xs text-dark-300 hover:text-red-400 transition-colors">
              ↩ Desagendar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
