import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export interface Superadmin {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateSuperadminInput {
  name: string;
  email: string;
  password: string;
}

export interface UpdateSuperadminInput {
  name?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
}

export function useSuperadmins() {
  const [superadmins, setSuperadmins] = useState<Superadmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuperadmins = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/admin/superadmins');
      setSuperadmins(data.data);
    } catch {
      toast.error('Error al cargar los administradores');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuperadmins();
  }, [fetchSuperadmins]);

  const createSuperadmin = async (input: CreateSuperadminInput): Promise<boolean> => {
    try {
      await api.post('/admin/superadmins', input);
      toast.success('Administrador creado exitosamente');
      await fetchSuperadmins();
      return true;
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al crear el administrador';
      toast.error(msg);
      return false;
    }
  };

  const updateSuperadmin = async (id: string, input: UpdateSuperadminInput): Promise<boolean> => {
    try {
      await api.put(`/admin/superadmins/${id}`, input);
      toast.success('Administrador actualizado');
      await fetchSuperadmins();
      return true;
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al actualizar el administrador';
      toast.error(msg);
      return false;
    }
  };

  const deleteSuperadmin = async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/admin/superadmins/${id}`);
      toast.success('Administrador eliminado');
      await fetchSuperadmins();
      return true;
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al eliminar el administrador';
      toast.error(msg);
      return false;
    }
  };

  return {
    superadmins,
    isLoading,
    createSuperadmin,
    updateSuperadmin,
    deleteSuperadmin,
    refetch: fetchSuperadmins,
  };
}
