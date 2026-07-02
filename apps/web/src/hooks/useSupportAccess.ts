import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export interface SupportAccessGrant {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'DENIED' | 'REVOKED';
  initiatedBy: 'ADMIN' | 'CLIENT';
  reason: string | null;
  durationHours: number | null;
  expiresAt: string | null;
  createdAt: string;
}

export type SupportAccessDisplayStatus = 'NONE' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'DENIED' | 'REVOKED';

export function useSupportAccess() {
  const [grant, setGrant] = useState<SupportAccessGrant | null>(null);
  const [displayStatus, setDisplayStatus] = useState<SupportAccessDisplayStatus>('NONE');
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/client/support-access/status');
      setGrant(data.data.grant);
      setDisplayStatus(data.data.displayStatus);
    } catch {
      toast.error('Error al cargar el estado de acceso de soporte');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const grantAccess = async (durationHours: number) => {
    try {
      await api.post('/client/support-access/grant', { durationHours });
      toast.success('Acceso de soporte otorgado');
      await fetchStatus();
      return true;
    } catch {
      toast.error('Error al otorgar el acceso');
      return false;
    }
  };

  const approveRequest = async (grantId: string, durationHours: number) => {
    try {
      await api.post(`/client/support-access/requests/${grantId}/approve`, { durationHours });
      toast.success('Solicitud aprobada');
      await fetchStatus();
      return true;
    } catch {
      toast.error('Error al aprobar la solicitud');
      return false;
    }
  };

  const denyRequest = async (grantId: string) => {
    try {
      await api.post(`/client/support-access/requests/${grantId}/deny`);
      toast.success('Solicitud rechazada');
      await fetchStatus();
      return true;
    } catch {
      toast.error('Error al rechazar la solicitud');
      return false;
    }
  };

  const revokeAccess = async () => {
    try {
      await api.post('/client/support-access/revoke');
      toast.success('Acceso revocado');
      await fetchStatus();
      return true;
    } catch {
      toast.error('Error al revocar el acceso');
      return false;
    }
  };

  return { grant, displayStatus, isLoading, grantAccess, approveRequest, denyRequest, revokeAccess };
}
