'use client';

import { useAuthStore } from '@/store/authStore';

export default function SuperadminSettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">Configuración</h1>
        <p className="text-dark-500 mt-1">Datos de tu cuenta de super administrador</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center text-xl font-bold text-primary-600">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-dark-900">{user?.name}</p>
            <p className="text-sm text-dark-400">Super Administrador</p>
          </div>
        </div>

        <dl className="space-y-3 pt-4 border-t border-dark-100">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-dark-500">Nombre</dt>
            <dd className="text-sm font-medium text-dark-900">{user?.name}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-dark-500">Email</dt>
            <dd className="text-sm font-medium text-dark-900">{user?.email}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
