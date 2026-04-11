'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { CreateClientInput } from '@/hooks/useClients';

const schema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z
    .string()
    .min(2, 'El identificador debe tener al menos 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones (ejemplo: mi-restaurante)'),
  plan: z.enum(['BASIC', 'PROFESSIONAL', 'PREMIUM']),
  adminName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  adminEmail: z.string().email('Ingresa un email válido'),
  adminPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type FormData = z.infer<typeof schema>;

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateClientInput) => Promise<boolean>;
}

const planOptions = [
  { value: 'BASIC', label: 'Básico — 500 conv/mes · 1 canal · GPT-4o mini' },
  { value: 'PROFESSIONAL', label: 'Profesional — 2000 conv/mes · 2 canales · Claude' },
  { value: 'PREMIUM', label: 'Premium — Ilimitado · Todos los canales · Todos los modelos' },
];

export function NewClientModal({ isOpen, onClose, onCreate }: NewClientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { plan: 'BASIC' },
  });

  // Auto-generar el slug desde el nombre
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
    setValue('slug', slug, { shouldValidate: true });
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    const success = await onCreate(data);
    setIsSubmitting(false);
    if (success) {
      reset();
      onClose();
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Agregar nuevo cliente" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Información del negocio */}
        <div>
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
            Datos del negocio
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Nombre del negocio"
                placeholder="Ej: Restaurante La Familia"
                error={errors.name?.message}
                {...register('name', {
                  onChange: handleNameChange,
                })}
              />
            </div>
            <div className="col-span-2">
              <Input
                label="Identificador único (slug)"
                placeholder="restaurante-la-familia"
                hint="Se usa en la URL. Solo letras minúsculas, números y guiones."
                error={errors.slug?.message}
                {...register('slug')}
              />
            </div>
            <div className="col-span-2">
              <Select
                label="Plan"
                options={planOptions}
                error={errors.plan?.message}
                {...register('plan')}
              />
            </div>
          </div>
        </div>

        <hr className="border-dark-200" />

        {/* Cuenta de administrador del cliente */}
        <div>
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
            Cuenta del administrador del cliente
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Nombre del administrador"
                placeholder="Ej: Juan García"
                error={errors.adminName?.message}
                {...register('adminName')}
              />
            </div>
            <Input
              label="Email de acceso"
              type="email"
              placeholder="juan@restaurante.com"
              error={errors.adminEmail?.message}
              {...register('adminEmail')}
            />
            <Input
              label="Contraseña inicial"
              type="password"
              placeholder="Mínimo 8 caracteres"
              hint="El cliente puede cambiarla después."
              error={errors.adminPassword?.message}
              {...register('adminPassword')}
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Crear cliente
          </Button>
        </div>
      </form>
    </Modal>
  );
}
