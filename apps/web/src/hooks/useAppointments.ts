import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export interface Appointment {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  patientName: string | null;
  service: string | null;
  appointmentDate: string | null;
  appointmentTime: string | null;
  notes: string | null;
  createdAt: string;
  lead: { id: string; name: string | null; phone: string | null; externalId: string | null };
  conversation: { id: string; channel: { type: string } };
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    try {
      const { data } = await api.get('/appointments');
      setAppointments(data.data ?? []);
    } catch {
      toast.error('Error al cargar las citas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const confirm = async (id: string) => {
    try {
      await api.put(`/appointments/${id}/confirm`);
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'CONFIRMED' } : a));
      toast.success('Cita confirmada');
    } catch {
      toast.error('Error al confirmar la cita');
    }
  };

  const cancel = async (id: string) => {
    try {
      await api.put(`/appointments/${id}/cancel`);
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'CANCELLED' } : a));
      toast.success('Cita cancelada');
    } catch {
      toast.error('Error al cancelar la cita');
    }
  };

  const saveNotes = async (id: string, notes: string) => {
    try {
      await api.put(`/appointments/${id}/notes`, { notes });
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, notes } : a));
      toast.success('Notas guardadas');
    } catch {
      toast.error('Error al guardar las notas');
    }
  };

  const pendingCount = appointments.filter((a) => a.status === 'PENDING').length;

  return { appointments, isLoading, confirm, cancel, saveNotes, pendingCount, refetch: fetchAppointments };
}
