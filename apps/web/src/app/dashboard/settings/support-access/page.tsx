'use client';

import { useState } from 'react';
import { useSupportAccess } from '@/hooks/useSupportAccess';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

const DURATION_OPTIONS = [
  { value: '1', label: '1 hora' },
  { value: '24', label: '24 horas' },
  { value: '168', label: '7 días' },
];

export default function SupportAccessPage() {
  const { grant, displayStatus, isLoading, grantAccess, approveRequest, denyRequest, revokeAccess } = useSupportAccess();
  const [duration, setDuration] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGrant = async () => {
    setIsSubmitting(true);
    await grantAccess(Number(duration));
    setIsSubmitting(false);
  };

  const handleApprove = async () => {
    if (!grant) return;
    setIsSubmitting(true);
    await approveRequest(grant.id, Number(duration));
    setIsSubmitting(false);
  };

  const handleDeny = async () => {
    if (!grant) return;
    await denyRequest(grant.id);
  };

  const handleRevoke = async () => {
    if (confirm('¿Revocar el acceso de soporte? El administrador dejará de poder ver tus leads y conversaciones de inmediato.')) {
      await revokeAccess();
    }
  };

  const expiresText = grant?.expiresAt
    ? new Date(grant.expiresAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">Acceso de soporte</h1>
        <p className="text-dark-500 mt-1">
          Controla cuándo el equipo de GoldenBot puede ver tus leads y conversaciones para ayudarte con soporte técnico
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card">
          {displayStatus === 'NONE' && (
            <>
              <p className="text-sm text-dark-600 mb-4">
                Por defecto, nadie del equipo de GoldenBot puede ver tus leads ni el contenido de tus conversaciones.
                Si necesitas ayuda, puedes autorizar un acceso temporal aquí.
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Select label="Duración del acceso" options={DURATION_OPTIONS} value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
                <Button onClick={handleGrant} isLoading={isSubmitting}>Permitir acceso</Button>
              </div>
            </>
          )}

          {displayStatus === 'PENDING' && grant && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="warning">Solicitud pendiente</Badge>
              </div>
              <p className="text-sm text-dark-600 mb-1">
                Un administrador de GoldenBot solicitó acceso a tu cuenta para brindarte soporte.
              </p>
              {grant.reason && (
                <p className="text-sm text-dark-500 italic mb-4">Motivo: &quot;{grant.reason}&quot;</p>
              )}
              <div className="flex items-end gap-3 mb-4">
                <div className="flex-1">
                  <Select label="Duración a otorgar" options={DURATION_OPTIONS} value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleApprove} isLoading={isSubmitting}>Aprobar</Button>
                <Button variant="secondary" onClick={handleDeny}>Rechazar</Button>
              </div>
            </>
          )}

          {displayStatus === 'ACTIVE' && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="success">Acceso activo</Badge>
              </div>
              <p className="text-sm text-dark-600 mb-4">
                El equipo de GoldenBot puede ver tus leads y conversaciones hasta el <strong>{expiresText}</strong>.
              </p>
              <Button variant="danger" onClick={handleRevoke}>Revocar acceso ahora</Button>
            </>
          )}

          {(displayStatus === 'EXPIRED' || displayStatus === 'DENIED' || displayStatus === 'REVOKED') && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="default">
                  {displayStatus === 'EXPIRED' ? 'Acceso vencido' : displayStatus === 'DENIED' ? 'Solicitud rechazada' : 'Acceso revocado'}
                </Badge>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Select label="Duración del acceso" options={DURATION_OPTIONS} value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
                <Button onClick={handleGrant} isLoading={isSubmitting}>Permitir acceso</Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
