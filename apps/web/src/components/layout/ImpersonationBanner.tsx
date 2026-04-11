'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

// Muestra un banner cuando el superadmin está viendo el panel de un cliente
export function ImpersonationBanner() {
  const router = useRouter();
  const { loadFromStorage } = useAuthStore();
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const superToken = localStorage.getItem('goldenbot_superadmin_token');
    setIsImpersonating(!!superToken);
  }, []);

  if (!isImpersonating) return null;

  const handleReturn = () => {
    const superToken = localStorage.getItem('goldenbot_superadmin_token');
    const superUser = localStorage.getItem('goldenbot_superadmin_user');

    if (superToken) {
      localStorage.setItem('goldenbot_token', superToken);
      if (superUser) localStorage.setItem('goldenbot_user', superUser);
      localStorage.removeItem('goldenbot_superadmin_token');
      localStorage.removeItem('goldenbot_superadmin_user');
      loadFromStorage();
      router.push('/superadmin/clients');
    }
  };

  return (
    <div className="bg-primary-500 text-white px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span>👁</span>
        <span className="font-medium">Estás viendo el panel como administrador del cliente</span>
      </div>
      <button
        onClick={handleReturn}
        className="bg-white text-primary-600 font-semibold px-3 py-1 rounded-lg hover:bg-primary-50 transition-colors text-xs"
      >
        ← Volver a mi panel
      </button>
    </div>
  );
}
