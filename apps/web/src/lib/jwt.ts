// Decodifica el payload de un JWT sin verificar la firma — solo para mostrar/ocultar
// elementos de la interfaz. La seguridad real la garantiza el backend.
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export interface GoldenBotTokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  clientId: string | null;
  impersonatedBy?: string;
  supportMode?: 'LIMITED' | 'SUPPORT';
}
