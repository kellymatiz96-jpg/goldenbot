'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClients, type ClientSummary } from '@/hooks/useClients';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { NewClientModal } from './NewClientModal';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const planConfig = {
  BASIC: { label: 'Básico', variant: 'default' as const },
  PROFESSIONAL: { label: 'Profesional', variant: 'info' as const },
  PREMIUM: { label: 'Premium', variant: 'gold' as const },
};

export default function ClientsPage() {
  const router = useRouter();
  const { clients, isLoading, createClient, impersonateClient } = useClients();
  const [showNewModal, setShowNewModal] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleImpersonate = async (client: ClientSummary) => {
    const token = await impersonateClient(client.id);
    if (!token) return;

    // Guardar el token del superadmin para poder volver
    const superToken = localStorage.getItem('goldenbot_token');
    if (superToken) {
      localStorage.setItem('goldenbot_superadmin_token', superToken);
      localStorage.setItem('goldenbot_superadmin_user', localStorage.getItem('goldenbot_user') || '');
    }

    // Usar el token del cliente
    localStorage.setItem('goldenbot_token', token);
    router.push('/dashboard');
  };

  const formatLastActivity = (dateStr: string | null) => {
    if (!dateStr) return 'Sin actividad';
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Clientes</h1>
          <p className="text-dark-500 mt-1">
            {clients.length} cliente{clients.length !== 1 ? 's' : ''} registrado{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          + Agregar cliente
        </Button>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar cliente por nombre, identificador o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-dark-800 mb-2">
            {search ? 'Sin resultados' : 'No hay clientes aún'}
          </h3>
          <p className="text-dark-400 text-sm mb-6">
            {search
              ? 'Intenta con otro término de búsqueda'
              : 'Agrega tu primer cliente para comenzar'}
          </p>
          {!search && (
            <Button onClick={() => setShowNewModal(true)}>
              + Agregar primer cliente
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Tarjetas móvil */}
          <div className="flex flex-col gap-3 md:hidden pb-8">
            {filtered.map((client) => {
              const plan = planConfig[client.plan];
              return (
                <div key={client.id} className="card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 flex-shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-dark-900 truncate">{client.name}</p>
                      <p className="text-xs text-dark-400 truncate">{client.email || `/${client.slug}`}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={plan.variant}>{plan.label}</Badge>
                      <Badge variant={client.isActive ? 'success' : 'danger'}>
                        {client.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-dark-500 mb-3">
                    <span>{client._count.leads} leads · {client._count.conversations} conversaciones</span>
                    <span>{formatLastActivity(client.lastActivityAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-dark-100">
                    <Button variant="secondary" size="sm" onClick={() => handleImpersonate(client)}>
                      Entrar como cliente
                    </Button>
                    <Link href={`/superadmin/clients/${client.id}`}>
                      <Button variant="ghost" size="sm">Ver cuenta</Button>
                    </Link>
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
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Email</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Estado</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Total leads</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Conversaciones</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Última actividad</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {filtered.map((client) => {
                  const plan = planConfig[client.plan];
                  return (
                    <tr key={client.id} className="hover:bg-dark-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 flex-shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-dark-900">{client.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-dark-400">/{client.slug}</span>
                              <Badge variant={plan.variant}>{plan.label}</Badge>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-dark-600">{client.email || '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={client.isActive ? 'success' : 'danger'}>
                          {client.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-dark-900">{client._count.leads}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-dark-900">{client._count.conversations}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-dark-600">{formatLastActivity(client.lastActivityAt)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleImpersonate(client)}
                            title="Acceder al panel del cliente"
                          >
                            Entrar como cliente
                          </Button>
                          <Link href={`/superadmin/clients/${client.id}`}>
                            <Button variant="ghost" size="sm">Ver cuenta</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal de nuevo cliente */}
      <NewClientModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreate={createClient}
      />
    </div>
  );
}
