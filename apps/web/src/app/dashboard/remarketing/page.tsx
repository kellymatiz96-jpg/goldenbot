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

interface Campaign {
  id: string;
  name: string;
  messages: string[];
  inactiveDays: number;
  isActive: boolean;
  createdAt: string;
  stats: { sent: number; responded: number };
}

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
  inactiveDays: z.coerce.number().min(1, 'Mínimo 1 día').max(30, 'Máximo 30 días'),
});

type FormData = z.infer<typeof schema>;

export default function RemarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { inactiveDays: 2 },
  });

  const fetchCampaigns = async () => {
    try {
      const { data } = await api.get('/remarketing/campaigns');
      setCampaigns(data.data);
    } catch {
      toast.error('Error al cargar las campañas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await api.post('/remarketing/campaigns', data);
      toast.success('Campaña creada exitosamente');
      reset();
      setShowModal(false);
      fetchCampaigns();
    } catch {
      toast.error('Error al crear la campaña');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCampaign = async (campaign: Campaign) => {
    try {
      await api.put(`/remarketing/campaigns/${campaign.id}/toggle`, {
        isActive: !campaign.isActive,
      });
      toast.success(campaign.isActive ? 'Campaña pausada' : 'Campaña activada');
      fetchCampaigns();
    } catch {
      toast.error('Error al actualizar la campaña');
    }
  };

  const runNow = async () => {
    setIsRunning(true);
    try {
      await api.post('/remarketing/run');
      toast.success('Remarketing ejecutado — revisa las conversaciones');
      fetchCampaigns();
    } catch {
      toast.error('Error al ejecutar el remarketing');
    } finally {
      setIsRunning(false);
    }
  };

  const simulateInactive = async () => {
    try {
      const { data } = await api.post('/remarketing/simulate-inactive');
      toast.success(data.message || 'Conversaciones marcadas como inactivas');
    } catch {
      toast.error('Error al simular inactividad');
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Remarketing automático</h1>
          <p className="text-dark-500 mt-1">
            Envía mensajes automáticos a leads que no han respondido en varios días.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Nueva campaña</Button>
      </div>

      {/* Explicación */}
      <div className="card bg-primary-50 border-primary-200 mb-6">
        <h3 className="font-semibold text-primary-900 mb-2">¿Cómo funciona?</h3>
        <ul className="text-sm text-primary-800 space-y-1.5">
          <li>• El sistema revisa cada hora qué leads no han respondido</li>
          <li>• Si un lead lleva más días inactivos que los que configuraste, le envía tu mensaje</li>
          <li>• Si el lead responde, <strong>sale automáticamente</strong> del remarketing</li>
          <li>• Puedes pausar o activar cada campaña cuando quieras</li>
        </ul>
      </div>

      {/* Botones de control */}
      <div className="flex justify-end gap-3 mb-4">
        <Button variant="secondary" size="sm" onClick={simulateInactive}>
          🕐 Simular leads inactivos (prueba)
        </Button>
        <Button variant="secondary" size="sm" onClick={runNow} isLoading={isRunning}>
          ▶ Ejecutar ahora (prueba)
        </Button>
      </div>

      {/* Lista de campañas */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">📢</div>
          <h3 className="font-semibold text-dark-800 mb-2">No hay campañas aún</h3>
          <p className="text-dark-400 text-sm mb-6">
            Crea tu primera campaña para recuperar leads inactivos automáticamente
          </p>
          <Button onClick={() => setShowModal(true)}>+ Crear primera campaña</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const responseRate = campaign.stats.sent > 0
              ? Math.round((campaign.stats.responded / campaign.stats.sent) * 100)
              : 0;

            return (
              <div key={campaign.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-dark-900">{campaign.name}</h3>
                      <Badge variant={campaign.isActive ? 'success' : 'default'}>
                        {campaign.isActive ? 'Activa' : 'Pausada'}
                      </Badge>
                    </div>
                    <p className="text-sm text-dark-500">
                      Se activa si el lead no responde en{' '}
                      <strong>{campaign.inactiveDays} día{campaign.inactiveDays > 1 ? 's' : ''}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => toggleCampaign(campaign)}
                    className={`text-xs font-medium transition-colors ${
                      campaign.isActive
                        ? 'text-red-400 hover:text-red-600'
                        : 'text-green-500 hover:text-green-700'
                    }`}
                  >
                    {campaign.isActive ? 'Pausar' : 'Activar'}
                  </button>
                </div>

                {/* Mensaje */}
                <div className="bg-dark-50 rounded-lg px-4 py-3 mb-4 text-sm text-dark-700 italic">
                  "{campaign.messages[0]}"
                </div>

                {/* Stats */}
                <div className="flex gap-6 text-sm">
                  <div>
                    <p className="text-dark-400">Enviados</p>
                    <p className="font-semibold text-dark-900">{campaign.stats.sent}</p>
                  </div>
                  <div>
                    <p className="text-dark-400">Respondieron</p>
                    <p className="font-semibold text-dark-900">{campaign.stats.responded}</p>
                  </div>
                  <div>
                    <p className="text-dark-400">Tasa de respuesta</p>
                    <p className={`font-semibold ${responseRate >= 30 ? 'text-green-600' : responseRate >= 10 ? 'text-yellow-600' : 'text-dark-900'}`}>
                      {responseRate}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nueva campaña */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); reset(); }}
        title="Nueva campaña de remarketing"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nombre de la campaña"
            placeholder="Ej: Seguimiento 2 días"
            error={errors.name?.message}
            {...register('name')}
          />

          <div>
            <label className="label">Mensaje que se enviará</label>
            <textarea
              rows={4}
              placeholder="Ej: ¡Hola! 👋 Vimos que estuviste preguntando por nuestros servicios. ¿Pudimos ayudarte? Estamos disponibles para resolver tus dudas."
              className="input resize-none"
              {...register('message')}
            />
            {errors.message && (
              <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>
            )}
            <p className="text-xs text-dark-400 mt-1">
              Puedes usar un tono amigable. El bot lo enviará automáticamente.
            </p>
          </div>

          <Input
            label="Días de inactividad para activarse"
            type="number"
            placeholder="2"
            hint="Si el lead no responde en este número de días, se envía el mensaje."
            error={errors.inactiveDays?.message}
            {...register('inactiveDays')}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); reset(); }}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Crear campaña
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
