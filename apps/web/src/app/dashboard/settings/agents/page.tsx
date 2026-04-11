'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const newAgentSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type NewAgentForm = z.infer<typeof newAgentSchema>;

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewAgentForm>({ resolver: zodResolver(newAgentSchema) });

  const fetchAgents = async () => {
    try {
      const { data } = await api.get('/client/agents');
      setAgents(data.data);
    } catch {
      toast.error('Error al cargar los agentes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAgents(); }, []);

  const onSubmit = async (data: NewAgentForm) => {
    setIsSubmitting(true);
    try {
      await api.post('/client/agents', data);
      toast.success('Agente creado exitosamente');
      reset();
      setShowModal(false);
      fetchAgents();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al crear el agente';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAgent = async (agent: Agent) => {
    try {
      await api.put(`/client/agents/${agent.id}`, { isActive: !agent.isActive });
      toast.success(agent.isActive ? 'Agente desactivado' : 'Agente activado');
      fetchAgents();
    } catch {
      toast.error('Error al actualizar el agente');
    }
  };

  const roleLabel: Record<string, string> = {
    CLIENT_ADMIN: 'Administrador',
    AGENT: 'Agente',
  };

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Agentes humanos</h1>
          <p className="text-dark-500 mt-1">
            Los agentes pueden tomar el control de conversaciones cuando el lead lo necesita.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="sm:flex-shrink-0">+ Agregar agente</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">👤</div>
          <h3 className="font-semibold text-dark-800 mb-2">No hay agentes aún</h3>
          <p className="text-dark-400 text-sm mb-6">
            Agrega agentes para que puedan atender conversaciones manualmente
          </p>
          <Button onClick={() => setShowModal(true)}>+ Agregar primer agente</Button>
        </div>
      ) : (
        <>
          {/* Tarjetas móvil */}
          <div className="flex flex-col gap-3 md:hidden">
            {agents.map((agent) => (
              <div key={agent.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-dark-900 truncate">{agent.name}</p>
                    <p className="text-xs text-dark-400 truncate">{agent.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge variant={agent.role === 'CLIENT_ADMIN' ? 'gold' : 'default'}>
                      {roleLabel[agent.role] || agent.role}
                    </Badge>
                    <Badge variant={agent.isActive ? 'success' : 'danger'}>
                      {agent.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
                {agent.role !== 'CLIENT_ADMIN' && (
                  <button
                    onClick={() => toggleAgent(agent)}
                    className={`text-xs font-medium transition-colors ${
                      agent.isActive ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'
                    }`}
                  >
                    {agent.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Tabla desktop */}
          <div className="hidden md:block card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-200">
                  <th className="text-left py-3 text-dark-500 font-medium">Nombre</th>
                  <th className="text-left py-3 text-dark-500 font-medium">Email</th>
                  <th className="text-left py-3 text-dark-500 font-medium">Rol</th>
                  <th className="text-left py-3 text-dark-500 font-medium">Estado</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} className="border-b border-dark-100 last:border-0">
                    <td className="py-3 font-medium text-dark-900">{agent.name}</td>
                    <td className="py-3 text-dark-500">{agent.email}</td>
                    <td className="py-3">
                      <Badge variant={agent.role === 'CLIENT_ADMIN' ? 'gold' : 'default'}>
                        {roleLabel[agent.role] || agent.role}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={agent.isActive ? 'success' : 'danger'}>
                        {agent.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {agent.role !== 'CLIENT_ADMIN' && (
                        <button
                          onClick={() => toggleAgent(agent)}
                          className={`text-xs font-medium transition-colors ${
                            agent.isActive ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'
                          }`}
                        >
                          {agent.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Info de cómo funciona */}
      <div className="card mt-6 bg-primary-50 border-primary-200">
        <h3 className="font-semibold text-primary-900 mb-2">¿Cómo funciona el escalado a agente?</h3>
        <ul className="text-sm text-primary-800 space-y-1.5">
          <li>• Cuando un lead escribe una palabra clave (ej: "agente"), el sistema alerta</li>
          <li>• Cuando un lead se clasifica como <strong>Caliente</strong>, se envía una alerta</li>
          <li>• Cualquier agente puede ir a la conversación y hacer clic en "Tomar control"</li>
          <li>• El bot queda pausado mientras el agente responde</li>
          <li>• El agente puede devolver la conversación al bot en cualquier momento</li>
        </ul>
      </div>

      {/* Modal crear agente */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); reset(); }}
        title="Agregar nuevo agente"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nombre completo"
            placeholder="Ej: María López"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Email de acceso"
            type="email"
            placeholder="maria@minegocio.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Contraseña inicial"
            type="password"
            placeholder="Mínimo 8 caracteres"
            hint="El agente podrá cambiarla después de ingresar."
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); reset(); }}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Crear agente
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
