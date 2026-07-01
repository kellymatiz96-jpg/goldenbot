'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Superadmin, CreateSuperadminInput, UpdateSuperadminInput } from '@/hooks/useSuperadmins';

const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

// En edición, la contraseña es opcional (solo se cambia si se escribe algo)
const editSchema = createSchema.extend({
  password: z.union([z.string().min(8, 'Mínimo 8 caracteres'), z.literal('')]),
});

type FormData = z.infer<typeof createSchema>;

interface SuperadminModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSuperadmin: Superadmin | null;
  onCreate: (input: CreateSuperadminInput) => Promise<boolean>;
  onUpdate: (id: string, input: UpdateSuperadminInput) => Promise<boolean>;
}

export function SuperadminModal({
  isOpen,
  onClose,
  editingSuperadmin,
  onCreate,
  onUpdate,
}: SuperadminModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!editingSuperadmin;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: editingSuperadmin?.name ?? '',
        email: editingSuperadmin?.email ?? '',
        password: '',
      });
    }
  }, [isOpen, editingSuperadmin, reset]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    let success = false;
    if (isEditing) {
      const payload: UpdateSuperadminInput = { name: data.name, email: data.email };
      if (data.password) payload.password = data.password;
      success = await onUpdate(editingSuperadmin.id, payload);
    } else {
      success = await onCreate(data);
    }
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Editar administrador' : 'Agregar administrador'}
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nombre"
          placeholder="Ej: Juan García"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Email de acceso"
          type="email"
          placeholder="admin@goldenbot.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label={isEditing ? 'Nueva contraseña' : 'Contraseña'}
          type="password"
          placeholder={isEditing ? 'Dejar en blanco para no cambiarla' : 'Mínimo 8 caracteres'}
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Guardar cambios' : 'Crear administrador'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
