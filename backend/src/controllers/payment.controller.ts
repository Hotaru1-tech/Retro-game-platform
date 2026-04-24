import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { paymentService } from '../services/payment.service';

const router = Router();

const paymentInitSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
});

const paymentConfirmSchema = z.object({
  paymentSessionId: z.string().uuid(),
});

router.post('/init', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = paymentInitSchema.parse(req.body);
    const session = await paymentService.initPayment(req.user!.userId!, data.plan);
    res.json(session);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    if (err.message === 'User not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err.message.includes('provider')) {
      res.status(503).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = paymentConfirmSchema.parse(req.body);
    const result = await paymentService.confirmPayment(req.user!.userId!, data.paymentSessionId);
    res.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    if (
      err.message === 'Payment session not found' ||
      err.message === 'User not found'
    ) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message === 'Payment session cannot be confirmed' ||
      err.message === 'Unsupported payment amount for subscription plan'
    ) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err.message.includes('provider')) {
      res.status(503).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const payments = await paymentService.getPaymentHistory(req.user!.userId!);
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
