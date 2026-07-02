'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { useSuperadmins, type Superadmin } from '@/hooks/useSuperadmins';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { SuperadminModal } from './SuperadminModal';
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

export default function SuperadminSettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { superadmins, isLoading, createSuperadmin, updateSuperadmin, deleteSuperadmin } = useSuperadmins();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Superadmin | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit = (sa: Superadmin) => { setEditing(sa); setShowModal(true); };

  const handleDelete = async (sa: Superadmin) => {
    if (sa.id === user?.id) return;
    if (confirm(`¿Eliminar al administrador "${sa.name}"? Esta acción no se puede deshacer.`)) {
      await deleteSuperadmin(sa.id);
    }
  };

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
      await api.put('/auth/password', { currentPassword: data.currentPassword, newPassword: data.newPassword });
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
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">Configuración</h1>
        <p className="text-dark-500 mt-1">Datos de tu cuenta y administradores de la plataforma</p>
      </div>

      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center text-xl font-bold text-primary-600">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-dark-900">{user?.name}</p>
            <p className="text-sm text-dark-400">Super Administrador</p>
          </div>
        </div>

        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4 pt-4 border-t border-dark-100">
          <Input label="Nombre" error={profileForm.formState.errors.name?.message} {...profileForm.register('name')} />
          <Input label="Email" type="email" error={profileForm.formState.errors.email?.message} {...profileForm.register('email')} />
          <Button type="submit" size="sm" isLoading={isSavingProfile}>Guardar cambios</Button>
        </form>
      </div>

      <div className="card mb-8">
        <h2 className="font-semibold text-dark-900 mb-4">Cambiar mi contraseña</h2>
        {user?.mustChangePassword && (
          <p className="text-sm text-orange-600 bg-orange-50 rounded-lg px-3 py-2 mb-4">
            Tu cuenta se creó con una contraseña genérica. Te recomendamos cambiarla ahora.
          </p>
        )}
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
          <Input label="Contraseña actual" type="password" error={passwordForm.formState.errors.currentPassword?.message} {...passwordForm.register('currentPassword')} />
          <Input label="Nueva contraseña" type="password" hint="Mínimo 8 caracteres" error={passwordForm.formState.errors.newPassword?.message} {...passwordForm.register('newPassword')} />
          <Input label="Confirmar nueva contraseña" type="password" error={passwordForm.formState.errors.confirmPassword?.message} {...passwordForm.register('confirmPassword')} />
          <Button type="submit" size="sm" isLoading={isSavingPassword}>Cambiar contraseña</Button>
        </form>
      </div>

      {/* Gestión de administradores */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-dark-900">Administradores de la plataforma</h2>
          <p className="text-sm text-dark-400">Quiénes tienen acceso al panel de superadmin</p>
        </div>
        <Button onClick={openCreate}>+ Agregar administrador</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-100 bg-dark-50">
                <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Nombre</th>
                <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Estado</th>
                <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {superadmins.map((sa) => (
                <tr key={sa.id} className="hover:bg-dark-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-dark-900">{sa.name}</span>
                      {sa.id === user?.id && <Badge variant="gold">Tú</Badge>}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-dark-600">{sa.email}</td>
                  <td className="px-5 py-4">
                    <Badge variant={sa.isActive ? 'success' : 'danger'}>
                      {sa.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(sa)}
                        className="text-xs font-medium text-primary-600 hover:text-primary-800"
                      >
                        Editar
                      </button>
                      {sa.id !== user?.id && (
                        <button
                          onClick={() => handleDelete(sa)}
                          className="text-xs font-medium text-dark-400 hover:text-red-500"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SuperadminModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        editingSuperadmin={editing}
        onCreate={createSuperadmin}
        onUpdate={updateSuperadmin}
      />
    </div>
  );
}
