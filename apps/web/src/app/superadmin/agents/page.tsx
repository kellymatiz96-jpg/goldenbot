'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

interface GlobalAgent {
  id: string;
  name: string;
  email: string;
  role: 'CLIENT_ADMIN' | 'AGENT';
  isActive: boolean;
  client: { id: string; name: string } | null;
}

export default function GlobalAgentsPage() {
  const [agents, setAgents] = useState<GlobalAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data } = await api.get('/admin/overview/agents');
        setAgents(data.data);
      } catch {
        toast.error('Error al cargar los agentes');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAgents();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">Agentes</h1>
        <p className="text-dark-500 mt-1">Administradores y agentes de todos los clientes</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🧑‍💼</div>
          <h3 className="text-lg font-semibold text-dark-800 mb-2">No hay agentes aún</h3>
          <p className="text-dark-400 text-sm">Aparecerán aquí cuando los clientes creen usuarios</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-100 bg-dark-50">
                <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Nombre</th>
                <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Cliente</th>
                <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Rol</th>
                <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-dark-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-dark-900">{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-dark-600">{agent.email}</td>
                  <td className="px-5 py-4 text-sm text-dark-600">{agent.client?.name || '—'}</td>
                  <td className="px-5 py-4">
                    <Badge variant={agent.role === 'CLIENT_ADMIN' ? 'gold' : 'default'}>
                      {agent.role === 'CLIENT_ADMIN' ? 'Admin' : 'Agente'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={agent.isActive ? 'success' : 'danger'}>
                      {agent.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
