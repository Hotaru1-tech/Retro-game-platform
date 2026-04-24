import { config } from '../config';
import { prisma } from '../lib/prisma';
import { BonumPaymentProvider, MockPaymentProvider, type PaymentProvider } from './payment.providers';
import type { PaymentPlan, PaymentProviderName, PaymentSession } from './payment.types';

const PLAN_PRICING: Record<PaymentPlan, number> = {
  monthly: 1.99,
  yearly: 9.99,
};

const PLAN_DURATION_MS: Record<PaymentPlan, number> = {
  monthly: 30 * 24 * 60 * 60 * 1000,
  yearly: 365 * 24 * 60 * 60 * 1000,
};

export class PaymentService {
  private readonly providers: Record<PaymentProviderName, PaymentProvider>;

  constructor() {
    this.providers = {
      mock: new MockPaymentProvider(),
      bonum: new BonumPaymentProvider(),
    };
  }

  async initPayment(userId: string, plan: PaymentPlan): Promise<PaymentSession> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const amount = PLAN_PRICING[plan];
    const provider = this.getProvider();
    const description = this.buildDescription(plan);

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        currency: 'USD',
        method: provider.name,
        status: 'PENDING',
        description,
      },
    });

    try {
      return await provider.init({
        paymentSessionId: payment.id,
        userId,
        plan,
        amount,
        currency: payment.currency,
        description,
      });
    } catch (error) {
      await prisma.payment.delete({ where: { id: payment.id } });
      throw error;
    }
  }

  async confirmPayment(userId: string, paymentSessionId: string) {
    const existingPayment = await prisma.payment.findFirst({
      where: { id: paymentSessionId, userId },
    });

    if (!existingPayment) {
      throw new Error('Payment session not found');
    }

    const plan = this.planFromPrice(existingPayment.amount);
    const provider = this.getProvider(existingPayment.method as PaymentProviderName);

    if (existingPayment.status === 'COMPLETED') {
      const subscription = await prisma.developerSubscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        throw new Error('Subscription record not found for completed payment');
      }

      return {
        success: true,
        message: `Payment of $${existingPayment.amount.toFixed(2)} already confirmed.`,
        payment: {
          id: existingPayment.id,
          amount: existingPayment.amount,
          currency: existingPayment.currency,
          method: existingPayment.method,
          cardLast4: existingPayment.cardLast4,
          cardBrand: existingPayment.cardBrand,
          status: existingPayment.status,
        },
        subscription,
      };
    }

    if (existingPayment.status !== 'PENDING') {
      throw new Error('Payment session cannot be confirmed');
    }

    const providerResult = await provider.confirm({
      paymentSessionId,
      userId,
      amount: existingPayment.amount,
      currency: existingPayment.currency,
      plan,
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const endDate = new Date(Date.now() + PLAN_DURATION_MS[plan]);

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.developerSubscription.upsert({
        where: { userId },
        create: {
          userId,
          plan,
          price: existingPayment.amount,
          status: 'ACTIVE',
          endDate,
        },
        update: {
          plan,
          price: existingPayment.amount,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate,
        },
      });

      await tx.profile.update({
        where: { userId },
        data: { isDeveloper: true },
      });

      if (user.role === 'PLAYER') {
        await tx.user.update({
          where: { id: userId },
          data: { role: 'DEVELOPER' },
        });
      }

      const payment = await tx.payment.update({
        where: { id: paymentSessionId },
        data: {
          method: providerResult.method,
          status: 'COMPLETED',
          cardLast4: providerResult.cardLast4,
          cardBrand: providerResult.cardBrand,
          subscriptionId: subscription.id,
        },
      });

      return { payment, subscription };
    });

    return {
      success: true,
      message: `Payment of $${result.payment.amount.toFixed(2)} processed successfully!`,
      payment: {
        id: result.payment.id,
        amount: result.payment.amount,
        currency: result.payment.currency,
        method: result.payment.method,
        cardLast4: result.payment.cardLast4,
        cardBrand: result.payment.cardBrand,
        status: result.payment.status,
      },
      subscription: result.subscription,
    };
  }

  async getPaymentHistory(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  private getProvider(name?: PaymentProviderName): PaymentProvider {
    const providerName = name || config.paymentProvider;
    const provider = this.providers[providerName];

    if (!provider) {
      throw new Error(`Unsupported payment provider: ${providerName}`);
    }

    return provider;
  }

  private buildDescription(plan: PaymentPlan) {
    return `Developer Mode - ${plan === 'monthly' ? 'Monthly' : 'Yearly'} Plan`;
  }

  private planFromPrice(amount: number): PaymentPlan {
    if (amount === PLAN_PRICING.monthly) return 'monthly';
    if (amount === PLAN_PRICING.yearly) return 'yearly';
    throw new Error('Unsupported payment amount for subscription plan');
  }
}

export const paymentService = new PaymentService();
