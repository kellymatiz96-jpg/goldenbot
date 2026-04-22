'use client';

import { useState } from 'react';
import { useAppointments, Appointment } from '@/hooks/useAppointments';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig = {
  PENDING: { label: 'Pendiente', variant: 'warning' as const, emoji: '⏳' },
  CONFIRMED: { label: 'Confirmada', variant: 'success' as const, emoji: '✅' },
  CANCELLED: { label: 'Cancelada', variant: 'danger' as const, emoji: '❌' },
};

const channelEmoji: Record<string, string> = {
  WHATSAPP: '📱', INSTAGRAM: '📸', WEBCHAT: '🌐',
};

export default function AppointmentsPage() {
  const { appointments, isLoading, confirm, cancel, saveNotes } = useAppointments();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCELLED'>('PENDING');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');

  const filtered = filter === 'ALL' ? appointments : appointments.filter((a) => a.status === filter);

  const pendingCount = appointments.filter((a) => a.status === 'PENDING').length;
  const confirmedCount = appointments.filter((a) => a.status === 'CONFIRMED').length;

  const handleEditNotes = (appt: Appointment) => {
    setEditingNotes(appt.id);
    setNotesInput(appt.notes ?? '');
  };

  const handleSaveNotes = async (id: string) => {
    await saveNotes(id, notesInput);
    setEditingNotes(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900">Citas agendadas</h1>
        <p className="text-dark-400 text-sm mt-1">
          Citas detectadas automáticamente por el chatbot
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-dark-200 p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{pendingCount}</p>
          <p className="text-xs text-dark-400 mt-1">Pendientes</p>
        </div>
        <div className="bg-white rounded-xl border border-dark-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{confirmedCount}</p>
          <p className="text-xs text-dark-400 mt-1">Confirmadas</p>
        </div>
        <div className="bg-white rounded-xl border border-dark-200 p-4 text-center">
          <p className="text-2xl font-bold text-dark-700">{appointments.length}</p>
          <p className="text-xs text-dark-400 mt-1">Total</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {(['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === f ? 'bg-primary-500 text-white' : 'bg-white text-dark-500 border border-dark-200 hover:bg-dark-50'
            )}
          >
            {f === 'ALL' ? 'Todas' : statusConfig[f].emoji + ' ' + statusConfig[f].label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dark-200">
          <div className="text-5xl mb-3">📅</div>
          <p className="text-dark-500 font-medium">No hay citas {filter !== 'ALL' ? statusConfig[filter].label.toLowerCase() + 's' : ''}</p>
          <p className="text-dark-400 text-sm mt-1">
            Las citas aparecen aquí cuando el chatbot detecta que un cliente quiere agendar
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appt) => {
            const status = statusConfig[appt.status];
            const leadName = appt.lead.name || appt.lead.phone || appt.lead.externalId || 'Desconocido';
            const timeAgo = formatDistanceToNow(new Date(appt.createdAt), { addSuffix: true, locale: es });

            return (
              <div
                key={appt.id}
                className={cn(
                  'bg-white rounded-xl border p-4',
                  appt.status === 'PENDING' ? 'border-orange-200 bg-orange-50' :
                  appt.status === 'CONFIRMED' ? 'border-green-200' : 'border-dark-200 opacity-70'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Encabezado */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant={status.variant}>{status.emoji} {status.label}</Badge>
                      <span className="text-xs text-dark-400">
                        {channelEmoji[appt.conversation.channel.type]} {timeAgo}
                      </span>
                    </div>

                    {/* Datos de la cita */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
                      <DataRow label="Cliente" value={leadName} />
                      {appt.patientName && appt.patientName !== leadName && (
                        <DataRow label="Nombre dado" value={appt.patientName} />
                      )}
                      <DataRow label="Servicio" value={appt.service} />
                      <DataRow label="Fecha" value={appt.appointmentDate} />
                      <DataRow label="Hora" value={appt.appointmentTime} />
                    </div>

                    {/* Notas */}
                    {editingNotes === appt.id ? (
                      <div className="mt-2">
                        <textarea
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="Agregar notas internas..."
                          className="input text-sm w-full h-20 resize-none"
                        />
                        <div className="flex gap-2 mt-1">
                          <Button size="sm" onClick={() => handleSaveNotes(appt.id)}>Guardar</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingNotes(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        {appt.notes ? (
                          <p className="text-xs text-dark-500 italic">📝 {appt.notes}</p>
                        ) : (
                          <p className="text-xs text-dark-300">Sin notas</p>
                        )}
                        <button
                          onClick={() => handleEditNotes(appt)}
                          className="text-xs text-primary-500 hover:underline flex-shrink-0"
                        >
                          {appt.notes ? 'Editar' : '+ Agregar nota'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  {appt.status === 'PENDING' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button size="sm" variant="primary" onClick={() => confirm(appt.id)}>
                        ✅ Confirmar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => cancel(appt.id)}>
                        ❌ Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs text-dark-400">{label}: </span>
      <span className="text-sm font-medium text-dark-800">{value}</span>
    </div>
  );
}
