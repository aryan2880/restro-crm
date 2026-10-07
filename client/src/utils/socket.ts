import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
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
