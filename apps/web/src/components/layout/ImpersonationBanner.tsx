'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { decodeJwtPayload, type GoldenBotTokenPayload } from '@/lib/jwt';

// Muestra un banner cuando el superadmin está viendo el panel de un cliente
export function ImpersonationBanner() {
  const router = useRouter();
  const { loadFromStorage } = useAuthStore();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [supportMode, setSupportMode] = useState<'LIMITED' | 'SUPPORT' | null>(null);

  useEffect(() => {
    const superToken = localStorage.getItem('goldenbot_superadmin_token');
    setIsImpersonating(!!superToken);

    if (superToken) {
      const currentToken = localStorage.getItem('goldenbot_token');
      const payload = currentToken ? decodeJwtPayload<GoldenBotTokenPayload>(currentToken) : null;
      setSupportMode(payload?.supportMode ?? null);
    }
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

  const isLimited = supportMode === 'LIMITED';

  return (
    <div className={`px-4 py-2 flex items-center justify-between text-sm text-white ${isLimited ? 'bg-dark-700' : 'bg-primary-500'}`}>
      <div className="flex items-center gap-2">
        <span>{isLimited ? '🔒' : '👁'}</span>
        <span className="font-medium">
          {isLimited
            ? 'Estás en modo limitado — sin acceso a leads ni conversaciones'
            : 'Estás en modo soporte con acceso autorizado. Todas las acciones quedan registradas.'}
        </span>
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
