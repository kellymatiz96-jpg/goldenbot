import { Server as SocketIOServer } from 'socket.io';

let _io: SocketIOServer | null = null;

export function initIO(io: SocketIOServer) {
  _io = io;
}

export function getIO(): SocketIOServer {
  if (!_io) throw new Error('Socket.io no ha sido inicializado');
  return _io;
}
