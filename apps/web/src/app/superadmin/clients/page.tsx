'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClients, type ClientSummary } from '@/hooks/useClients';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
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
  const { clients, isLoading, createClient, toggleClientStatus, impersonateClient } = useClients();
  const { login } = useAuthStore();
  const [showNewModal, setShowNewModal] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase())
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
          placeholder="Buscar cliente por nombre o identificador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-sm"
        />
      </div>

      {/* Lista de clientes */}
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
        <div className="grid gap-4">
          {filtered.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onToggleStatus={() => toggleClientStatus(client.id, !client.isActive)}
              onImpersonate={() => handleImpersonate(client)}
            />
          ))}
        </div>
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

function ClientCard({
  client,
  onToggleStatus,
  onImpersonate,
}: {
  client: ClientSummary;
  onToggleStatus: () => void;
  onImpersonate: () => void;
}) {
  const plan = planConfig[client.plan];
  const timeAgo = formatDistanceToNow(new Date(client.createdAt), {
    addSuffix: true,
    locale: es,
  });

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        {/* Avatar del cliente */}
        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-xl font-bold text-primary-600 flex-shrink-0">
          {client.name.charAt(0).toUpperCase()}
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-dark-900">{client.name}</h3>
            <Badge variant={plan.variant}>{plan.label}</Badge>
            {!client.isActive && (
              <Badge variant="danger">Inactivo</Badge>
            )}
          </div>
          <p className="text-dark-400 text-sm mt-0.5">
            /{client.slug} · Creado {timeAgo}
          </p>
        </div>

        {/* Métricas */}
        <div className="hidden md:flex items-center gap-6 text-center">
          <div>
            <p className="text-lg font-bold text-dark-900">{client._count.leads}</p>
            <p className="text-xs text-dark-400">Leads</p>
          </div>
          <div>
            <p className="text-lg font-bold text-dark-900">{client._count.conversations}</p>
            <p className="text-xs text-dark-400">Conversaciones</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={onImpersonate}
            title="Acceder al panel del cliente"
          >
            Ver panel
          </Button>
          <Link href={`/superadmin/clients/${client.id}`}>
            <Button variant="ghost" size="sm">
              Editar
            </Button>
          </Link>
          <button
            onClick={onToggleStatus}
            title={client.isActive ? 'Desactivar cliente' : 'Activar cliente'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-sm ${
              client.isActive
                ? 'hover:bg-red-50 text-dark-300 hover:text-red-500'
                : 'hover:bg-green-50 text-dark-300 hover:text-green-500'
            }`}
          >
            {client.isActive ? '⏸' : '▶'}
          </button>
        </div>
      </div>
    </div>
  );
}
