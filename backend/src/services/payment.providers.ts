import type {
  ProviderConfirmInput,
  ProviderConfirmResult,
  ProviderInitInput,
  ProviderInitResult,
} from './payment.types';

export interface PaymentProvider {
  readonly name: 'mock' | 'bonum';
  init(input: ProviderInitInput): Promise<ProviderInitResult>;
  confirm(input: ProviderConfirmInput): Promise<ProviderConfirmResult>;
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock' as const;

  async init(input: ProviderInitInput): Promise<ProviderInitResult> {
    return {
      paymentSessionId: input.paymentSessionId,
      provider: this.name,
      status: 'pending',
      amount: input.amount,
      currency: input.currency,
      plan: input.plan,
      title: 'Mock Checkout',
      description: 'Confirm this mock payment to activate Developer Mode in development or staging.',
    };
  }

  async confirm(_input: ProviderConfirmInput): Promise<ProviderConfirmResult> {
    return {
      provider: this.name,
      status: 'completed',
      method: 'mock',
      cardLast4: null,
      cardBrand: null,
    };
  }
}

export class BonumPaymentProvider implements PaymentProvider {
  readonly name = 'bonum' as const;

  async init(_input: ProviderInitInput): Promise<ProviderInitResult> {
    throw new Error('Bonum payment provider is not implemented yet');
  }

  async confirm(_input: ProviderConfirmInput): Promise<ProviderConfirmResult> {
    throw new Error('Bonum payment provider is not implemented yet');
  }
}
