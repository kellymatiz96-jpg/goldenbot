import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';

import { env } from './config/env';
import { logger } from './shared/utils/logger';
import { initIO } from './config/socket';
import { errorHandler } from './shared/middlewares/errorHandler';

// Rutas
import authRoutes from './modules/auth/auth.routes';
import clientsRoutes from './modules/clients/clients.routes';
import clientRoute from './modules/clients/client.routes';
import conversationsRoutes from './modules/conversations/conversations.routes';
import webhookRoutes from './modules/chatbot/webhook.routes';
import webchatRoutes from './modules/channels/webchat.routes';
import whatsappRoutes from './modules/channels/whatsapp.routes';
import remarketingRoutes from './modules/remarketing/remarketing.routes';
import leadsRoutes from './modules/leads/leads.routes';
import { startRemarketingScheduler } from './modules/remarketing/remarketing.scheduler';

const app = express();
const httpServer = http.createServer(app);

// ---- Socket.io ----
const io = new SocketIOServer(httpServer, {
  cors: { origin: env.cors.origin, methods: ['GET', 'POST'] },
});

initIO(io);

io.on('connection', (socket) => {
  logger.debug(`[Socket.io] Cliente conectado: ${socket.id}`);

  socket.on('join:client', (clientId: string) => {
    socket.join(`client:${clientId}`);
    logger.debug(`[Socket.io] Socket ${socket.id} unido al room client:${clientId}`);
  });

  socket.on('join:conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('disconnect', () => {
    logger.debug(`[Socket.io] Cliente desconectado: ${socket.id}`);
  });
});

// ---- Middlewares globales ----
app.use(helmet());
app.use(compression());
app.use(cors({ origin: env.cors.origin, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

// Rate limiting: máximo 100 requests por 15 minutos por IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Demasiadas solicitudes. Intenta en 15 minutos.' },
  })
);

// ---- Health check ----
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'GoldenBot API funcionando correctamente',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ---- Rutas ----
app.use('/auth', authRoutes);
app.use('/admin/clients', clientsRoutes);
app.use('/client', clientRoute);
app.use('/conversations', conversationsRoutes);
app.use('/webhook', webhookRoutes);
app.use('/webchat', webchatRoutes);
app.use('/webhook/whatsapp', whatsappRoutes);
app.use('/remarketing', remarketingRoutes);
app.use('/leads', leadsRoutes);

// ---- 404 ----
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// ---- Manejo global de errores (debe ir al final) ----
app.use(errorHandler);

// ---- Iniciar servidor ----
httpServer.listen(env.port, () => {
  logger.info(`🚀 GoldenBot API corriendo en puerto ${env.port}`);
  logger.info(`   Ambiente: ${env.nodeEnv}`);
  logger.info(`   Health check: http://localhost:${env.port}/health`);
  startRemarketingScheduler();
});

export default app;
