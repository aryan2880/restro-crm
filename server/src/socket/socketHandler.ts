import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
  });

  io.on('connection', (socket: Socket) => {
    // Join restaurant tenant channel (for owners, managers, waiters)
    socket.on('join:restaurant', (restaurantId: string) => {
      if (restaurantId) {
        socket.join(`restaurant:${restaurantId}`);
      }
    });

    // Join kitchen channel (for KDS displays)
    socket.on('join:kitchen', (restaurantId: string) => {
      if (restaurantId) {
        socket.join(`kitchen:${restaurantId}`);
      }
    });

    // Join individual order channel (for customer live tracking)
    socket.on('join:order', (orderId: string) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean up if needed
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet.');
  }
  return io;
};

export const emitToRestaurant = (restaurantId: string, event: string, data: any) => {
  if (io) {
    io.to(`restaurant:${restaurantId}`).emit(event, data);
  }
};

export const emitToKitchen = (restaurantId: string, event: string, data: any) => {
  if (io) {
    io.to(`kitchen:${restaurantId}`).emit(event, data);
  }
};

export const emitToOrder = (orderId: string, event: string, data: any) => {
  if (io) {
    io.to(`order:${orderId}`).emit(event, data);
  }
};
