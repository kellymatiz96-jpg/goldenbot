'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSuperadmins, type Superadmin } from '@/hooks/useSuperadmins';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SuperadminModal } from './SuperadminModal';

export default function SuperadminSettingsPage() {
  const { user } = useAuthStore();
  const { superadmins, isLoading, createSuperadmin, updateSuperadmin, deleteSuperadmin } = useSuperadmins();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Superadmin | null>(null);

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit = (sa: Superadmin) => { setEditing(sa); setShowModal(true); };

  const handleDelete = async (sa: Superadmin) => {
    if (sa.id === user?.id) return;
    if (confirm(`¿Eliminar al administrador "${sa.name}"? Esta acción no se puede deshacer.`)) {
      await deleteSuperadmin(sa.id);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">Configuración</h1>
        <p className="text-dark-500 mt-1">Datos de tu cuenta y administradores de la plataforma</p>
      </div>

      <div className="card mb-8">
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
