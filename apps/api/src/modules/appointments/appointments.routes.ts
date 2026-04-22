import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate';
import {
  getAppointments,
  confirmAppointment,
  cancelAppointment,
  updateAppointmentNotes,
} from './appointments.service';

const router = Router();
router.use(authenticate);

// GET /appointments — listar todas las citas del cliente
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointments = await getAppointments(req.user!.clientId!);
    res.json({ success: true, data: appointments });
  } catch (err) { next(err); }
});

// PUT /appointments/:id/confirm — confirmar cita
router.put('/:id/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await confirmAppointment(req.user!.clientId!, req.params.id);
    res.json({ success: true, data: appointment });
  } catch (err) { next(err); }
});

// PUT /appointments/:id/cancel — cancelar cita
router.put('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await cancelAppointment(req.user!.clientId!, req.params.id);
    res.json({ success: true, data: appointment });
  } catch (err) { next(err); }
});

// PUT /appointments/:id/notes — agregar/editar notas del agente
router.put('/:id/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notes } = req.body;
    const appointment = await updateAppointmentNotes(req.user!.clientId!, req.params.id, notes ?? '');
    res.json({ success: true, data: appointment });
  } catch (err) { next(err); }
});

export default router;
