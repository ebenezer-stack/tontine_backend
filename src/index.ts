import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.routes';

// Fix BigInt JSON serialization issue
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

dotenv.config();

export const app = express();
const port = process.env.PORT || 8000;
export const prisma = new PrismaClient();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import userRoutes from './routes/user.routes';
import dashboardRoutes from './routes/dashboard.routes';
import tontineRoutes from './routes/tontine.routes';
import kycRoutes from './routes/kyc.routes';
import guarantorRoutes from './routes/guarantor.routes';
import contributionRoutes from './routes/contribution.routes';
import { ContributionController } from './controllers/ContributionController';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tontines', tontineRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/guarantors', guarantorRoutes);

// Contribution nested routes
app.use('/api/tontines/:tontine/contributions', contributionRoutes);
app.get('/api/tontines/:tontine/pending-payments', ContributionController.pendingPayments);

// Global contribution routes
app.get('/api/contributions/history', ContributionController.history);

// Payment routes
app.post('/api/payments/verify', ContributionController.verifyPayment);
app.get('/api/payments/:paymentId/verify-fedapay', ContributionController.verifyFedaPayPayment);
app.post('/api/payments/:paymentId/approve', ContributionController.approve);
app.post('/api/payments/:paymentId/reject', ContributionController.reject);

// Webhook
app.post('/api/fedapay/webhook', ContributionController.fedapayWebhook);

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'TontineApp Node.js Backend is running!' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

