// Extender el tipo Request de Express para incluir el usuario autenticado
import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: Role;
        clientId: string | null;
      };
    }
  }
}
