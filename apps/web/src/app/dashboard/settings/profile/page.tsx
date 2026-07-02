'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
    newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSaveProfile = async (data: ProfileForm) => {
    setIsSavingProfile(true);
    try {
      await api.put('/auth/profile', data);
      updateUser(data);
      toast.success('Perfil actualizado');
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al actualizar el perfil';
      toast.error(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onChangePassword = async (data: PasswordForm) => {
    setIsSavingPassword(true);
    try {
      await api.put('/auth/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      updateUser({ mustChangePassword: false });
      toast.success('Contraseña actualizada');
      passwordForm.reset();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al cambiar la contraseña';
      toast.error(msg);
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">Mi perfil</h1>
        <p className="text-dark-500 mt-1">Tus datos de acceso a GoldenBot</p>
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold text-dark-900 mb-4">Datos personales</h2>
        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
          <Input label="Nombre" error={profileForm.formState.errors.name?.message} {...profileForm.register('name')} />
          <Input label="Email" type="email" error={profileForm.formState.errors.email?.message} {...profileForm.register('email')} />
          <Button type="submit" isLoading={isSavingProfile}>Guardar cambios</Button>
        </form>
      </div>

      <div className="card">
        <h2 className="font-semibold text-dark-900 mb-4">Cambiar contraseña</h2>
        {user?.mustChangePassword && (
          <p className="text-sm text-orange-600 bg-orange-50 rounded-lg px-3 py-2 mb-4">
            Tu cuenta se creó con una contraseña genérica. Te recomendamos cambiarla ahora.
          </p>
        )}
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
          <Input
            label="Contraseña actual"
            type="password"
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register('currentPassword')}
          />
          <Input
            label="Nueva contraseña"
            type="password"
            hint="Mínimo 8 caracteres"
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register('newPassword')}
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />
          <Button type="submit" isLoading={isSavingPassword}>Cambiar contraseña</Button>
        </form>
      </div>
    </div>
  );
}
