'use client';

import { useState } from 'react';
import { useToastStore } from '@/components/Toast';
import { apiFetch, cn } from '@/lib/utils';
import { CreditCard, X, Lock, CheckCircle } from 'lucide-react';

interface PaymentModalProps {
  plan: 'monthly' | 'yearly';
  onSuccess: (data: any) => void;
  onClose: () => void;
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

function getCardIcon(num: string): string {
  const d = num.replace(/\s/g, '');
  if (/^4/.test(d)) return '💳 Visa';
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return '💳 Mastercard';
  if (/^3[47]/.test(d)) return '💳 Amex';
  if (/^6/.test(d)) return '💳 Discover';
  return '💳';
}

export default function PaymentModal({ plan, onSuccess, onClose }: PaymentModalProps) {
  const [method, setMethod] = useState<'card' | 'paypal'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const price = plan === 'monthly' ? 1.99 : 9.99;
  const planLabel = plan === 'monthly' ? 'Monthly' : 'Yearly';

  const handlePay = async () => {
    setError('');
    setLoading(true);
    try {
      const body: any = { plan, method };
      if (method === 'card') {
        if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
          setError('Please fill in all card fields');
          setLoading(false);
          return;
        }
        body.cardNumber = cardNumber;
        body.cardExpiry = cardExpiry;
        body.cardCvv = cardCvv;
        body.cardName = cardName;
      } else {
        if (!paypalEmail) {
          setError('Please enter your PayPal email');
          setLoading(false);
          return;
        }
        body.paypalEmail = paypalEmail;
      }

      const data = await apiFetch('/api/payments/process', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      setSuccess(true);
      useToastStore.getState().addToast(data.message, 'success');
      setTimeout(() => onSuccess(data), 1500);
    } catch (err: any) {
      setError(err.message);
      useToastStore.getState().addToast(err.message, 'error');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center">
        <div className="bg-retro-window border-t-[2px] border-l-[2px] border-white border-b-[2px] border-r-[2px] border-b-black border-r-black w-[380px]">
          <div className="retro-title-bar px-2 py-1">
            <span className="text-[11px] font-bold">Payment Complete</span>
          </div>
          <div className="p-6 text-center">
            <CheckCircle size={48} className="mx-auto text-green-600 mb-3" />
            <h3 className="font-bold text-[14px] text-green-800 mb-1">Payment Successful!</h3>
            <p className="text-[11px] text-gray-600">Developer Mode has been activated.</p>
            <p className="text-[10px] text-gray-500 mt-1">${price.toFixed(2)} charged — {planLabel} plan</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center">
      <div className="bg-retro-window border-t-[2px] border-l-[2px] border-white border-b-[2px] border-r-[2px] border-b-black border-r-black w-[400px] max-h-[90vh] overflow-y-auto">
        {/* Title bar */}
        <div className="retro-title-bar px-2 py-1 flex justify-between items-center">
          <span className="text-[11px] font-bold flex items-center gap-1"><Lock size={10} /> Secure Payment</span>
          <button className="retro-window-button" onClick={onClose}><X size={8} /></button>
        </div>

        <div className="p-4">
          {/* Order summary */}
          <div className="retro-panel-inset p-3 mb-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[12px]">Developer Mode — {planLabel}</h3>
                <p className="text-[9px] text-gray-500">{plan === 'monthly' ? 'Billed monthly' : 'Billed annually (save 58%)'}</p>
              </div>
              <div className="font-bold text-[18px] text-retro-title">${price.toFixed(2)}</div>
            </div>
          </div>

          {/* Payment method tabs */}
          <div className="flex gap-0 mb-3">
            <button
              className={cn('flex-1 px-3 py-1.5 text-[11px] border border-gray-400 flex items-center justify-center gap-1',
                method === 'card' ? 'bg-white font-bold border-b-white' : 'bg-retro-button')}
              onClick={() => setMethod('card')}
            >
              <CreditCard size={12} /> Credit Card
            </button>
            <button
              className={cn('flex-1 px-3 py-1.5 text-[11px] border border-gray-400 flex items-center justify-center gap-1',
                method === 'paypal' ? 'bg-white font-bold border-b-white' : 'bg-retro-button')}
              onClick={() => setMethod('paypal')}
            >
              <span className="text-[13px] font-bold text-blue-800">P</span> PayPal
            </button>
          </div>

          {/* Card form */}
          {method === 'card' && (
            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] block mb-0.5 font-bold text-gray-700">Card Number</label>
                <div className="relative">
                  <input
                    className="retro-input w-full pr-20 font-mono"
                    value={cardNumber}
                    onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-500">
                    {getCardIcon(cardNumber)}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-[10px] block mb-0.5 font-bold text-gray-700">Cardholder Name</label>
                <input
                  className="retro-input w-full"
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] block mb-0.5 font-bold text-gray-700">Expiry</label>
                  <input
                    className="retro-input w-full font-mono"
                    value={cardExpiry}
                    onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                </div>
                <div className="w-[80px]">
                  <label className="text-[10px] block mb-0.5 font-bold text-gray-700">CVV</label>
                  <input
                    className="retro-input w-full font-mono"
                    value={cardCvv}
                    onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    maxLength={4}
                    type="password"
                  />
                </div>
              </div>
              {/* Accepted cards */}
              <div className="flex items-center gap-2 text-[9px] text-gray-500">
                <span>Accepted:</span>
                <span className="retro-panel px-1.5 py-0.5">Visa</span>
                <span className="retro-panel px-1.5 py-0.5">Mastercard</span>
                <span className="retro-panel px-1.5 py-0.5">Amex</span>
                <span className="retro-panel px-1.5 py-0.5">Discover</span>
              </div>
            </div>
          )}

          {/* PayPal form */}
          {method === 'paypal' && (
            <div className="space-y-2.5">
              <div className="retro-panel-inset p-3 text-center mb-2">
                <div className="text-[16px] font-bold text-blue-800 mb-1">
                  <span className="text-blue-600">Pay</span><span className="text-blue-900">Pal</span>
                </div>
                <p className="text-[10px] text-gray-500">Pay securely with your PayPal account</p>
              </div>
              <div>
                <label className="text-[10px] block mb-0.5 font-bold text-gray-700">PayPal Email</label>
                <input
                  type="email"
                  className="retro-input w-full"
                  value={paypalEmail}
                  onChange={e => setPaypalEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-2 bg-red-100 border border-red-400 text-red-800 text-[10px] px-2 py-1.5 rounded-sm">
              {error}
            </div>
          )}

          {/* Pay button */}
          <button
            className="retro-button w-full font-bold text-[12px] mt-4 py-2 flex items-center justify-center gap-2"
            onClick={handlePay}
            disabled={loading}
          >
            <Lock size={12} />
            {loading ? 'Processing...' : `Pay $${price.toFixed(2)}`}
          </button>

          {/* Security note */}
          <div className="mt-2 flex items-center gap-1.5 text-[9px] text-gray-500 justify-center">
            <Lock size={9} />
            <span>Secure payment · SSL encrypted · Your card details are never stored</span>
          </div>
        </div>
      </div>
    </div>
  );
}
