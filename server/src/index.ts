import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSocket } from './socket/socketHandler';

import authRoutes from './routes/auth.routes';
import restaurantRoutes from './routes/restaurant.routes';
import tableRoutes from './routes/table.routes';
import categoryRoutes from './routes/category.routes';
import menuRoutes from './routes/menu.routes';
import orderRoutes from './routes/order.routes';
import kdsRoutes from './routes/kds.routes';
import billingRoutes from './routes/billing.routes';
import customerRoutes from './routes/customer.routes';
import reviewRoutes from './routes/review.routes';
import staffRoutes from './routes/staff.routes';
import analyticsRoutes from './routes/analytics.routes';
import superadminRoutes from './routes/superadmin.routes';
import notificationRoutes from './routes/notification.routes';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-restaurant-id'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Restaurant QR Ordering & CRM SaaS Platform API',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/kds', kdsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/notifications', notificationRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Restaurant CRM Backend Server running on http://localhost:${PORT}`);
});
