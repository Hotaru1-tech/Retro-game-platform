import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Validate card number (Luhn algorithm)
function isValidCardNumber(num: string): boolean {
  const digits = num.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// Detect card brand
function getCardBrand(num: string): string {
  const d = num.replace(/\s/g, '');
  if (/^4/.test(d)) return 'Visa';
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  if (/^6(?:011|5)/.test(d)) return 'Discover';
  if (/^35/.test(d)) return 'JCB';
  if (/^3(?:0[0-5]|[68])/.test(d)) return 'Diners';
  return 'Unknown';
}

// Process payment (simulated — in production, use Stripe/PayPal SDK)
const paymentSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
  method: z.enum(['card', 'paypal']),
  cardNumber: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvv: z.string().optional(),
  cardName: z.string().optional(),
  paypalEmail: z.string().email().optional(),
});

router.post('/process', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = paymentSchema.parse(req.body);
    const userId = req.user!.userId!;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const price = data.plan === 'monthly' ? 1.99 : 9.99;
    let cardLast4: string | null = null;
    let cardBrand: string | null = null;

    // Validate payment method
    if (data.method === 'card') {
      if (!data.cardNumber || !data.cardExpiry || !data.cardCvv || !data.cardName) {
        res.status(400).json({ error: 'All card fields are required' });
        return;
      }

      const cleanNum = data.cardNumber.replace(/\s/g, '');

      if (!isValidCardNumber(cleanNum)) {
        res.status(400).json({ error: 'Invalid card number' });
        return;
      }

      // Validate expiry (MM/YY)
      const expiryMatch = data.cardExpiry.match(/^(\d{2})\/(\d{2})$/);
      if (!expiryMatch) {
        res.status(400).json({ error: 'Invalid expiry format. Use MM/YY' });
        return;
      }
      const month = parseInt(expiryMatch[1]);
      const year = parseInt('20' + expiryMatch[2]);
      const now = new Date();
      if (month < 1 || month > 12 || new Date(year, month) < now) {
        res.status(400).json({ error: 'Card is expired' });
        return;
      }

      // Validate CVV
      if (!/^\d{3,4}$/.test(data.cardCvv)) {
        res.status(400).json({ error: 'Invalid CVV' });
        return;
      }

      cardLast4 = cleanNum.slice(-4);
      cardBrand = getCardBrand(cleanNum);

    } else if (data.method === 'paypal') {
      if (!data.paypalEmail) {
        res.status(400).json({ error: 'PayPal email is required' });
        return;
      }
    }

    // --- Simulate payment processing ---
    // In production: call Stripe.charges.create() or PayPal SDK here
    // For demo: payment always succeeds after validation

    const durationMs = data.plan === 'monthly' ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000;
    const endDate = new Date(Date.now() + durationMs);

    // Create/update subscription
    const subscription = await prisma.developerSubscription.upsert({
      where: { userId },
      create: { userId, plan: data.plan, price, status: 'ACTIVE', endDate },
      update: { plan: data.plan, price, status: 'ACTIVE', startDate: new Date(), endDate },
    });

    // Enable developer mode
    await prisma.profile.update({
      where: { userId },
      data: { isDeveloper: true },
    });

    // Upgrade role if still PLAYER
    if (user.role === 'PLAYER') {
      await prisma.user.update({ where: { id: userId }, data: { role: 'DEVELOPER' } });
    }

    // Record the payment
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: price,
        currency: 'USD',
        method: data.method,
        cardLast4,
        cardBrand,
        status: 'COMPLETED',
        description: `Developer Mode - ${data.plan === 'monthly' ? 'Monthly' : 'Yearly'} Plan`,
        subscriptionId: subscription.id,
      },
    });

    res.json({
      success: true,
      message: `Payment of $${price.toFixed(2)} processed successfully!`,
      payment: {
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        cardLast4: payment.cardLast4,
        cardBrand: payment.cardBrand,
        status: payment.status,
      },
      subscription,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// Get payment history
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.userId! },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
