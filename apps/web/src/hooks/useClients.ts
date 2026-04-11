import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export interface ClientSummary {
  id: string;
  name: string;
  slug: string;
  plan: 'BASIC' | 'PROFESSIONAL' | 'PREMIUM';
  isActive: boolean;
  createdAt: string;
  _count: {
    leads: number;
    conversations: number;
  };
}

export interface ClientDetail extends ClientSummary {
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
  businessInfo: {
    businessName: string;
    description: string | null;
    services: string | null;
    schedule: string | null;
  } | null;
  channels: Array<{
    id: string;
    type: string;
    isActive: boolean;
  }>;
  aiConfig: {
    chatbotProvider: string;
    chatbotModel: string;
  } | null;
}

export interface CreateClientInput {
  name: string;
  slug: string;
  plan: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

export function useClients() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/admin/clients');
      setClients(data.data);
    } catch {
      toast.error('Error al cargar los clientes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const createClient = async (input: CreateClientInput): Promise<boolean> => {
    try {
      await api.post('/admin/clients', input);
      toast.success('Cliente creado exitosamente');
      await fetchClients();
      return true;
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al crear el cliente';
      toast.error(msg);
      return false;
    }
  };

  const toggleClientStatus = async (id: string, isActive: boolean): Promise<void> => {
    try {
      await api.put(`/admin/clients/${id}`, { isActive });
      toast.success(isActive ? 'Cliente activado' : 'Cliente desactivado');
      await fetchClients();
    } catch {
      toast.error('Error al actualizar el cliente');
    }
  };

  const impersonateClient = async (id: string): Promise<string | null> => {
    try {
      const { data } = await api.post(`/admin/clients/${id}/impersonate`);
      return data.data.accessToken;
    } catch {
      toast.error('Error al acceder al panel del cliente');
      return null;
    }
  };

  return { clients, isLoading, createClient, toggleClientStatus, impersonateClient, refetch: fetchClients };
}

export function useClientDetail(id: string) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClient = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/admin/clients/${id}`);
        setClient(data.data);
      } catch {
        toast.error('Error al cargar el cliente');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchClient();
  }, [id]);

  const updateClient = async (updates: Partial<{ name: string; plan: string; isActive: boolean }>) => {
    try {
      const { data } = await api.put(`/admin/clients/${id}`, updates);
      setClient((prev) => (prev ? { ...prev, ...data.data } : prev));
      toast.success('Cliente actualizado');
      return true;
    } catch {
      toast.error('Error al actualizar el cliente');
      return false;
    }
  };

  return { client, isLoading, updateClient };
}
