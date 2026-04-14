'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

const schema = z.object({
  businessName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  services: z.string().optional(),
  prices: z.string().optional(),
  schedule: z.string().optional(),
  location: z.string().optional(),
  conversionGoal: z.string().optional(),
  welcomeMessage: z.string().optional(),
  humanKeywords: z.string().optional(),
  extraInfo: z.string().optional(),
  faq: z.array(
    z.object({
      question: z.string().min(1, 'La pregunta no puede estar vacía'),
      answer: z.string().min(1, 'La respuesta no puede estar vacía'),
    })
  ),
});

type FormData = z.infer<typeof schema>;

export default function BusinessSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { faq: [] },
  });

  const { fields: faqFields, append: addFaq, remove: removeFaq } = useFieldArray({
    control,
    name: 'faq',
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/client/business-info');
        if (data.data) {
          const info = data.data;
          reset({
            businessName: info.businessName || '',
            description: info.description || '',
            services: info.services || '',
            prices: info.prices || '',
            schedule: info.schedule || '',
            location: info.location || '',
            conversionGoal: info.conversionGoal || '',
            welcomeMessage: info.welcomeMessage || '',
            humanKeywords: (info.humanKeywords || []).join(', '),
            extraInfo: info.extraInfo || '',
            faq: info.faq || [],
          });
        }
      } catch {
        toast.error('Error al cargar la información del negocio');
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const keywords = data.humanKeywords
        ? data.humanKeywords.split(',').map((k) => k.trim()).filter(Boolean)
        : [];

      await api.put('/client/business-info', {
        ...data,
        humanKeywords: keywords,
        faq: data.faq,
      });
      toast.success('Información guardada. El bot ya usa estos datos.');
    } catch {
      toast.error('Error al guardar la información');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">Información de mi negocio</h1>
        <p className="text-dark-500 mt-1">
          Esta información la usa el chatbot para responder a tus clientes. Cuanto más completa,
          mejores serán las respuestas.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información básica */}
        <Section title="Información básica" icon="🏢">
          <Input
            label="Nombre del negocio"
            placeholder="Ej: Restaurante La Familia"
            error={errors.businessName?.message}
            {...register('businessName')}
          />
          <div>
            <label className="label">Descripción del negocio</label>
            <textarea
              rows={3}
              placeholder="Describe brevemente qué hace tu negocio..."
              className="input resize-none"
              {...register('description')}
            />
          </div>
        </Section>

        {/* Productos y servicios */}
        <Section title="Productos y servicios" icon="📦">
          <div>
            <label className="label">¿Qué vendes o qué servicios ofreces?</label>
            <textarea
              rows={4}
              placeholder="Ej: Ofrecemos cortes de cabello para hombres y mujeres, tintes, mechas, tratamientos capilares..."
              className="input resize-none"
              {...register('services')}
            />
            <p className="text-xs text-dark-400 mt-1">
              Sé específico. El bot usará esto para responder preguntas sobre tus servicios.
            </p>
          </div>
          <div>
            <label className="label">Precios o rangos de precios</label>
            <textarea
              rows={3}
              placeholder="Ej: Corte de hombre: $15-20, Corte de mujer: $25-40, Tinte completo desde $60..."
              className="input resize-none"
              {...register('prices')}
            />
          </div>
        </Section>

        {/* Horarios y ubicación */}
        <Section title="Horarios y ubicación" icon="📍">
          <Input
            label="Horarios de atención"
            placeholder="Ej: Lunes a Viernes 9am-7pm, Sábados 9am-3pm, Domingos cerrado"
            {...register('schedule')}
          />
          <Input
            label="Ubicación o zona de servicio"
            placeholder="Ej: Centro de Bogotá, calle 15 #8-32 / Servicio a domicilio en toda la ciudad"
            {...register('location')}
          />
        </Section>

        {/* Configuración del bot */}
        <Section title="Configuración del chatbot" icon="🤖">
          <div>
            <label className="label">¿Cuál es el objetivo principal del bot?</label>
            <select className="input" {...register('conversionGoal')}>
              <option value="">— Selecciona el tipo de negocio —</option>
              <option value="APPOINTMENT">Agendar citas o consultas</option>
              <option value="VISIT">Invitar a visitar el local (tienda, restaurante, etc.)</option>
              <option value="ORDER">Tomar pedidos o ventas por WhatsApp</option>
              <option value="CALL">Derivar a llamada telefónica</option>
              <option value="INFO">Solo informar (sin acción específica)</option>
            </select>
            <p className="text-xs text-dark-400 mt-1">
              El bot adapta su comportamiento según el objetivo. Por ejemplo, si eliges "Agendar citas", el bot pedirá el día y hora al cliente y notificará al agente.
            </p>
          </div>
          <div>
            <label className="label">Mensaje de bienvenida</label>
            <textarea
              rows={2}
              placeholder="Ej: ¡Hola! Bienvenido a La Familia Peluquería. ¿En qué puedo ayudarte hoy?"
              className="input resize-none"
              {...register('welcomeMessage')}
            />
          </div>
          <Input
            label="Palabras clave para pedir agente humano"
            placeholder="agente, humano, persona, hablar con alguien"
            hint="Separadas por comas. Cuando el cliente escriba estas palabras, se alerta a un agente."
            {...register('humanKeywords')}
          />
          <div>
            <label className="label">Información adicional para el bot</label>
            <textarea
              rows={3}
              placeholder="Cualquier otra información que el bot deba saber: políticas de cancelación, métodos de pago, etc."
              className="input resize-none"
              {...register('extraInfo')}
            />
          </div>
        </Section>

        {/* Preguntas frecuentes */}
        <Section title="Preguntas frecuentes (FAQ)" icon="❓">
          <p className="text-sm text-dark-500 -mt-1 mb-3">
            Agrega las preguntas que más te hacen tus clientes y sus respuestas. El bot las usará directamente.
          </p>

          {faqFields.map((field, index) => (
            <div key={field.id} className="border border-dark-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-dark-600">Pregunta {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeFaq(index)}
                  className="text-red-400 hover:text-red-600 text-sm transition-colors"
                >
                  Eliminar
                </button>
              </div>
              <Input
                placeholder="¿Cuánto cuesta un corte de cabello?"
                error={errors.faq?.[index]?.question?.message}
                {...register(`faq.${index}.question`)}
              />
              <div>
                <textarea
                  rows={2}
                  placeholder="El corte de caballero cuesta entre $15 y $20, dependiendo del tipo de corte..."
                  className="input resize-none"
                  {...register(`faq.${index}.answer`)}
                />
                {errors.faq?.[index]?.answer && (
                  <p className="text-red-500 text-xs mt-1">{errors.faq[index]?.answer?.message}</p>
                )}
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            onClick={() => addFaq({ question: '', answer: '' })}
            className="w-full"
          >
            + Agregar pregunta frecuente
          </Button>
        </Section>

        {/* Botón guardar */}
        <div className="flex items-center justify-between pt-2 pb-8">
          {isDirty && (
            <p className="text-sm text-orange-500">Tienes cambios sin guardar</p>
          )}
          <div className="ml-auto">
            <Button type="submit" isLoading={isSaving} size="lg">
              Guardar información
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold text-dark-900 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}
