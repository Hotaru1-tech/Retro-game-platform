export type PaymentPlan = 'monthly' | 'yearly';
export type PaymentProviderName = 'mock' | 'bonum';
export type PaymentSessionStatus = 'pending' | 'completed';

export interface PaymentSession {
  paymentSessionId: string;
  provider: PaymentProviderName;
  status: PaymentSessionStatus;
  amount: number;
  currency: string;
  plan: PaymentPlan;
  title: string;
  description: string;
}

export interface ProviderInitInput {
  paymentSessionId: string;
  userId: string;
  plan: PaymentPlan;
  amount: number;
  currency: string;
  description: string;
}

export interface ProviderConfirmInput {
  paymentSessionId: string;
  userId: string;
  amount: number;
  currency: string;
  plan: PaymentPlan;
}

export interface ProviderInitResult {
  paymentSessionId: string;
  provider: PaymentProviderName;
  status: 'pending';
  amount: number;
  currency: string;
  plan: PaymentPlan;
  title: string;
  description: string;
}

export interface ProviderConfirmResult {
  provider: PaymentProviderName;
  status: 'completed';
  method: string;
  cardLast4: string | null;
  cardBrand: string | null;
}
