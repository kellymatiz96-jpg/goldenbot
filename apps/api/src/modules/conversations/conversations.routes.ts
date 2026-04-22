import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate';
import {
  getConversations,
  getConversationWithMessages,
  takeOverConversation,
  releaseConversation,
  sendAgentMessage,
  getDashboardMetrics,
  markAppointmentBooked,
} from './conversations.service';

const router = Router();

router.use(authenticate);

// GET /conversations/dashboard — métricas del cliente
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const metrics = await getDashboardMetrics(clientId);
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
});

// GET /conversations — lista paginada
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const page = parseInt(req.query.page as string) || 1;
    const result = await getConversations(clientId, page);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /conversations/:id — conversación con mensajes
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const conversation = await getConversationWithMessages(clientId, req.params.id);
    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

// POST /conversations/:id/take-over — agente toma el control
router.post('/:id/take-over', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const agentId = req.user!.id;
    const conversation = await takeOverConversation(clientId, req.params.id, agentId);
    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

// POST /conversations/:id/agent-message — agente envía mensaje
router.post('/:id/agent-message', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      res.status(400).json({ success: false, message: 'El contenido del mensaje es requerido' });
      return;
    }
    const message = await sendAgentMessage(clientId, req.params.id, content);
    res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

// POST /conversations/:id/release — devolver al bot
router.post('/:id/release', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const conversation = await releaseConversation(clientId, req.params.id);
    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

// PUT /conversations/:id/appointment-booked — marcar/desmarcar cita agendada
router.put('/:id/appointment-booked', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.clientId!;
    const booked = req.body.booked !== false;
    const lead = await markAppointmentBooked(clientId, req.params.id, booked);
    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
});

export default router;
