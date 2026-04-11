'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useClientDetail } from '@/hooks/useClients';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const planOptions = [
  { value: 'BASIC', label: 'Básico' },
  { value: 'PROFESSIONAL', label: 'Profesional' },
  { value: 'PREMIUM', label: 'Premium' },
];

const editSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  plan: z.enum(['BASIC', 'PROFESSIONAL', 'PREMIUM']),
});

type EditForm = z.infer<typeof editSchema>;

const planConfig = {
  BASIC: { label: 'Básico', variant: 'default' as const },
  PROFESSIONAL: { label: 'Profesional', variant: 'info' as const },
  PREMIUM: { label: 'Premium', variant: 'gold' as const },
};

const channelLabel: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  WEBCHAT: 'Webchat',
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { client, isLoading, updateClient } = useClientDetail(id);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  const startEditing = () => {
    if (!client) return;
    reset({ name: client.name, plan: client.plan });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    reset();
  };

  const onSubmit = async (data: EditForm) => {
    setIsSaving(true);
    const ok = await updateClient(data);
    setIsSaving(false);
    if (ok) setIsEditing(false);
  };

  const handleImpersonate = async () => {
    setIsImpersonating(true);
    try {
      const { data } = await api.post(`/admin/clients/${id}/impersonate`);
      const token = data.data.accessToken;

      // Guardar token del superadmin para poder regresar
      const superToken = localStorage.getItem('goldenbot_token');
      if (superToken) {
        localStorage.setItem('goldenbot_superadmin_token', superToken);
        localStorage.setItem('goldenbot_superadmin_user', localStorage.getItem('goldenbot_user') || '');
      }

      localStorage.setItem('goldenbot_token', token);
      router.push('/dashboard');
    } catch {
      toast.error('Error al acceder al panel del cliente');
    } finally {
      setIsImpersonating(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!client) return;
    const ok = await updateClient({ isActive: !client.isActive });
    if (ok) {
      toast.success(client.isActive ? 'Cliente desactivado' : 'Cliente activado');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="card text-center py-16">
        <p className="text-dark-500">Cliente no encontrado.</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    );
  }

  const plan = planConfig[client.plan];

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="text-dark-400 hover:text-dark-700 text-sm flex items-center gap-1"
        >
          ← Volver
        </button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-600">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-900">{client.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-dark-400 text-sm">/{client.slug}</span>
              <Badge variant={plan.variant}>{plan.label}</Badge>
              <Badge variant={client.isActive ? 'success' : 'danger'}>
                {client.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleImpersonate}
            isLoading={isImpersonating}
          >
            Ver su panel
          </Button>
          <Button
            variant={client.isActive ? 'danger' : 'secondary'}
            onClick={handleToggleStatus}
          >
            {client.isActive ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Leads totales" value={client._count.leads} icon="🎯" />
        <MetricCard label="Conversaciones" value={client._count.conversations} icon="💬" />
        <MetricCard label="Agentes" value={client.users.length} icon="👤" />
        <MetricCard label="Canales" value={client.channels.filter((c) => c.isActive).length} icon="📡" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información del negocio */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-dark-900">Datos del cliente</h2>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={startEditing}>
                Editar
              </Button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Nombre del negocio"
                error={errors.name?.message}
                {...register('name')}
              />
              <Select
                label="Plan"
                options={planOptions}
                error={errors.plan?.message}
                {...register('plan')}
              />
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" isLoading={isSaving}>
                  Guardar
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={cancelEditing}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <dl className="space-y-3">
              <InfoRow label="Nombre" value={client.name} />
              <InfoRow label="Identificador" value={`/${client.slug}`} />
              <InfoRow label="Plan" value={plan.label} />
              <InfoRow
                label="Negocio configurado"
                value={client.businessInfo?.businessName || 'No configurado'}
              />
            </dl>
          )}
        </div>

        {/* Configuración de IA y canales */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-dark-900 mb-4">Configuración de IA</h2>
            {client.aiConfig ? (
              <dl className="space-y-3">
                <InfoRow label="Proveedor chatbot" value={client.aiConfig.chatbotProvider} />
                <InfoRow label="Modelo" value={client.aiConfig.chatbotModel} />
              </dl>
            ) : (
              <p className="text-dark-400 text-sm">Sin configuración de IA</p>
            )}
          </div>

          <div className="card">
            <h2 className="font-semibold text-dark-900 mb-4">Canales activos</h2>
            {client.channels.length > 0 ? (
              <div className="space-y-2">
                {client.channels.map((ch) => (
                  <div key={ch.id} className="flex items-center justify-between">
                    <span className="text-sm text-dark-700">{channelLabel[ch.type] || ch.type}</span>
                    <Badge variant={ch.isActive ? 'success' : 'default'}>
                      {ch.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-400 text-sm">No hay canales configurados aún</p>
            )}
          </div>
        </div>
      </div>

      {/* Usuarios del cliente */}
      <div className="card mt-6">
        <h2 className="font-semibold text-dark-900 mb-4">Usuarios de este cliente</h2>
        {client.users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-200">
                  <th className="text-left py-2 text-dark-500 font-medium">Nombre</th>
                  <th className="text-left py-2 text-dark-500 font-medium">Email</th>
                  <th className="text-left py-2 text-dark-500 font-medium">Rol</th>
                  <th className="text-left py-2 text-dark-500 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {client.users.map((user) => (
                  <tr key={user.id} className="border-b border-dark-100 last:border-0">
                    <td className="py-3 text-dark-900 font-medium">{user.name}</td>
                    <td className="py-3 text-dark-500">{user.email}</td>
                    <td className="py-3">
                      <Badge variant={user.role === 'CLIENT_ADMIN' ? 'gold' : 'default'}>
                        {user.role === 'CLIENT_ADMIN' ? 'Admin' : 'Agente'}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-dark-400 text-sm">No hay usuarios registrados</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="card text-center py-4">
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-2xl font-bold text-dark-900">{value}</p>
      <p className="text-xs text-dark-400 mt-0.5">{label}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sm text-dark-500 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-dark-900 font-medium text-right">{value}</dd>
    </div>
  );
}
