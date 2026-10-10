import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const socketServer = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') || '/';
    socket = io(socketServer, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.on('connect_error', (err) => {
      console.warn('Real-time sync alert:', err.message);
    });
  }
  return socket;
};

export const joinRestaurantRoom = (restaurantId: string): void => {
  const s = getSocket();
  if (restaurantId) {
    s.emit('join:restaurant', restaurantId);
  }
};

export const joinKitchenRoom = (restaurantId: string): void => {
  const s = getSocket();
  if (restaurantId) {
    s.emit('join:kitchen', restaurantId);
  }
};

export const joinOrderRoom = (orderId: string): void => {
  const s = getSocket();
  if (orderId) {
    s.emit('join:order', orderId);
  }
};
