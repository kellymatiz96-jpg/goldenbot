'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClients, type ClientSummary } from '@/hooks/useClients';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { NewClientModal } from './NewClientModal';

const planConfig = {
  BASIC: { label: 'Básico', variant: 'default' as const },
  PROFESSIONAL: { label: 'Profesional', variant: 'info' as const },
  PREMIUM: { label: 'Premium', variant: 'gold' as const },
};

const supportStatusConfig: Record<ClientSummary['supportStatus'], { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
  NONE: { label: 'Sin acceso', variant: 'default' },
  PENDING: { label: 'Pendiente', variant: 'warning' },
  ACTIVE: { label: 'Activo', variant: 'success' },
  EXPIRED: { label: 'Vencido', variant: 'default' },
  DENIED: { label: 'Rechazado', variant: 'danger' },
  REVOKED: { label: 'Revocado', variant: 'danger' },
};

function ConnBadge({ on }: { on: boolean }) {
  return <Badge variant={on ? 'success' : 'default'}>{on ? 'Sí' : 'No'}</Badge>;
}

export default function ClientsPage() {
  const router = useRouter();
  const { clients, isLoading, createClient, impersonateClient, requestSupportAccess } = useClients();
  const [showNewModal, setShowNewModal] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleImpersonate = async (client: ClientSummary) => {
    const result = await impersonateClient(client.id);
    if (!result) return;

    // Guardar el token del superadmin para poder volver
    const superToken = localStorage.getItem('goldenbot_token');
    if (superToken) {
      localStorage.setItem('goldenbot_superadmin_token', superToken);
      localStorage.setItem('goldenbot_superadmin_user', localStorage.getItem('goldenbot_user') || '');
    }

    // Usar el token del cliente
    localStorage.setItem('goldenbot_token', result.accessToken);
    router.push('/dashboard');
  };

  const handleRequestAccess = async (client: ClientSummary) => {
    const reason = window.prompt(`¿Por qué necesitas acceso a la cuenta de "${client.name}"? (opcional)`) ?? undefined;
    await requestSupportAccess(client.id, reason || undefined);
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
              const support = supportStatusConfig[client.supportStatus];
              const hasAccess = client.supportStatus === 'ACTIVE';
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
                  <div className="grid grid-cols-3 gap-2 text-center text-xs text-dark-500 mb-3">
                    <div><p className="font-semibold text-dark-900">{client.leadsThisMonth}</p>Leads/mes</div>
                    <div><p className="font-semibold text-dark-900">{client.unansweredCount}</p>Sin responder</div>
                    <div><p className="font-semibold text-dark-900">{client.commercialScore}</p>Score</div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-dark-400">Soporte:</span>
                    <Badge variant={support.variant}>{support.label}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-dark-100">
                    {hasAccess ? (
                      <Button variant="secondary" size="sm" onClick={() => handleImpersonate(client)}>Entrar como cliente</Button>
                    ) : (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => handleImpersonate(client)}>Entrar en modo limitado</Button>
                        {client.supportStatus !== 'PENDING' && (
                          <Button variant="ghost" size="sm" onClick={() => handleRequestAccess(client)}>Solicitar acceso</Button>
                        )}
                      </>
                    )}
                    <Link href={`/superadmin/clients/${client.id}`}>
                      <Button variant="ghost" size="sm">Ver cuenta</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabla desktop */}
          <div className="hidden md:block card p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-100 bg-dark-50">
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-4 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-4 py-3">Estado</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-4 py-3">Plan</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-4 py-3">Bot</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-4 py-3">Widget</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-4 py-3">WhatsApp</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-4 py-3">Leads mes</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-4 py-3">Conv. mes</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-4 py-3">Sin responder</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-4 py-3">Score</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-4 py-3">Soporte</th>
                  <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {filtered.map((client) => {
                  const support = supportStatusConfig[client.supportStatus];
                  const hasAccess = client.supportStatus === 'ACTIVE';
                  return (
                    <tr key={client.id} className="hover:bg-dark-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-dark-900">{client.name}</p>
                            <p className="text-xs text-dark-400">{client.email || `/${client.slug}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={client.isActive ? 'success' : 'danger'}>
                          {client.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={planConfig[client.plan].variant}>{planConfig[client.plan].label}</Badge>
                      </td>
                      <td className="px-4 py-4"><ConnBadge on={client.botActive} /></td>
                      <td className="px-4 py-4"><ConnBadge on={client.widgetActive} /></td>
                      <td className="px-4 py-4"><ConnBadge on={client.whatsappActive} /></td>
                      <td className="px-4 py-4 text-sm font-semibold text-dark-900">{client.leadsThisMonth}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-dark-900">{client.conversationsThisMonth}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-dark-900">{client.unansweredCount}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-dark-900">{client.commercialScore}/100</td>
                      <td className="px-4 py-4">
                        <Badge variant={support.variant}>{support.label}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {hasAccess ? (
                            <Button variant="secondary" size="sm" onClick={() => handleImpersonate(client)} title="Acceso completo autorizado">
                              Entrar como cliente
                            </Button>
                          ) : (
                            <>
                              <Button variant="secondary" size="sm" onClick={() => handleImpersonate(client)} title="Sin datos personales de leads">
                                Modo limitado
                              </Button>
                              {client.supportStatus !== 'PENDING' && (
                                <Button variant="ghost" size="sm" onClick={() => handleRequestAccess(client)}>
                                  Solicitar acceso
                                </Button>
                              )}
                            </>
                          )}
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
