import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate';
import { getLeads, updateLeadTemperature, updateAppointmentNotes, updateAppointmentStatus } from './leads.service';

const router = Router();

router.use(authenticate);

// GET /leads — lista paginada con filtros
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const page = parseInt(req.query.page as string) || 1;
    const temperature = req.query.temperature as string | undefined;
    const search = req.query.search as string | undefined;
    const appointmentBooked = req.query.appointmentBooked === 'true' ? true : req.query.appointmentBooked === 'false' ? false : undefined;
    const appointmentStatus = req.query.appointmentStatus as string | undefined;
    const result = await getLeads(clientId, page, 20, temperature, search, appointmentBooked, appointmentStatus);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// PATCH /leads/:id/temperature — cambiar temperatura manualmente
router.patch('/:id/temperature', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const { temperature } = req.body;
    if (!['COLD', 'WARM', 'HOT'].includes(temperature)) {
      res.status(400).json({ success: false, message: 'Temperatura inválida' });
      return;
    }
    const result = await updateLeadTemperature(clientId, req.params.id, temperature);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// PATCH /leads/:id/appointment-status — marcar como atendido o cancelado
router.patch('/:id/appointment-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const { status } = req.body;
    if (!['ATTENDED', 'CANCELLED'].includes(status)) {
      res.status(400).json({ success: false, message: 'Estado inválido' });
      return;
    }
    const result = await updateAppointmentStatus(clientId, req.params.id, status);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// PATCH /leads/:id/appointment-notes — guardar notas de cita
router.patch('/:id/appointment-notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const { notes } = req.body;
    const result = await updateAppointmentNotes(clientId, req.params.id, notes ?? '');
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
