'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

interface IntegrationRow {
  id: string;
  name: string;
  whatsapp: boolean;
  instagram: boolean;
  webchat: boolean;
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <Badge variant={connected ? 'success' : 'default'}>
      {connected ? '✓ Conectado' : 'No conectado'}
    </Badge>
  );
}

export default function IntegrationsPage() {
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const { data } = await api.get('/admin/overview/integrations');
        setRows(data.data);
      } catch {
        toast.error('Error al cargar las integraciones');
      } finally {
        setIsLoading(false);
      }
    };
    fetchIntegrations();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">Integraciones</h1>
        <p className="text-dark-500 mt-1">Estado de los canales conectados por cliente</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🔌</div>
          <h3 className="text-lg font-semibold text-dark-800 mb-2">No hay clientes aún</h3>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-100 bg-dark-50">
                <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Cliente</th>
                <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">📱 WhatsApp</th>
                <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">📸 Instagram</th>
                <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">🌐 Webchat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-dark-50 transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-dark-900">{row.name}</td>
                  <td className="px-5 py-4"><ConnectionBadge connected={row.whatsapp} /></td>
                  <td className="px-5 py-4"><ConnectionBadge connected={row.instagram} /></td>
                  <td className="px-5 py-4"><ConnectionBadge connected={row.webchat} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
