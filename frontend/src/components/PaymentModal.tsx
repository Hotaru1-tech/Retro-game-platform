'use client';

import { useEffect, useState } from 'react';
import { useToastStore } from '@/components/Toast';
import { apiFetch } from '@/lib/utils';
import { X, Lock, CheckCircle, Loader2 } from 'lucide-react';

interface PaymentModalProps {
  plan: 'monthly' | 'yearly';
  onSuccess: (data: any) => void;
  onClose: () => void;
}

interface PaymentSession {
  paymentSessionId: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  plan: 'monthly' | 'yearly';
  title: string;
  description: string;
}

export default function PaymentModal({ plan, onSuccess, onClose }: PaymentModalProps) {
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const price = plan === 'monthly' ? 1.99 : 9.99;
  const planLabel = plan === 'monthly' ? 'Monthly' : 'Yearly';

  useEffect(() => {
    let cancelled = false;

    const initPayment = async () => {
      setInitializing(true);
      setError('');

      try {
        const data = await apiFetch('/api/payments/init', {
          method: 'POST',
          body: JSON.stringify({ plan }),
        });

        if (!cancelled) {
          setSession(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          useToastStore.getState().addToast(err.message, 'error');
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    initPayment();

    return () => {
      cancelled = true;
    };
  }, [plan]);

  const handleConfirm = async () => {
    if (!session) return;

    setError('');
    setLoading(true);

    try {
      const data = await apiFetch('/api/payments/confirm', {
        method: 'POST',
        body: JSON.stringify({ paymentSessionId: session.paymentSessionId }),
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
            <p className="text-[10px] text-gray-500 mt-1">${price.toFixed(2)} charged - {planLabel} plan</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center">
      <div className="bg-retro-window border-t-[2px] border-l-[2px] border-white border-b-[2px] border-r-[2px] border-b-black border-r-black w-[400px] max-h-[90vh] overflow-y-auto">
        <div className="retro-title-bar px-2 py-1 flex justify-between items-center">
          <span className="text-[11px] font-bold flex items-center gap-1"><Lock size={10} /> Mock Checkout</span>
          <button className="retro-window-button" onClick={onClose}><X size={8} /></button>
        </div>

        <div className="p-4">
          <div className="retro-panel-inset p-3 mb-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[12px]">Developer Mode - {planLabel}</h3>
                <p className="text-[9px] text-gray-500">{plan === 'monthly' ? 'Billed monthly' : 'Billed annually (save 58%)'}</p>
              </div>
              <div className="font-bold text-[18px] text-retro-title">${price.toFixed(2)}</div>
            </div>
          </div>

          <div className="retro-panel p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-bold text-[12px]">Checkout Provider</div>
                <div className="text-[10px] text-gray-500">
                  {initializing ? 'Preparing session...' : session?.provider === 'mock' ? 'Mock Checkout' : session?.provider}
                </div>
              </div>
              <div className="retro-panel px-2 py-1 text-[10px] font-bold uppercase">
                {initializing ? 'Pending' : session?.status ?? 'Pending'}
              </div>
            </div>
            <div className="text-[10px] text-gray-600 space-y-2">
              <p>This temporary checkout is used for development and staging until the Bonum integration goes live.</p>
              {session && (
                <>
                  <div className="retro-panel-inset px-2 py-1">
                    Session: <span className="font-mono">{session.paymentSessionId}</span>
                  </div>
                  <p>{session.description}</p>
                </>
              )}
            </div>
          </div>

          {initializing && (
            <div className="retro-panel-inset p-4 text-center text-[11px] text-gray-600 mb-3">
              <Loader2 size={18} className="mx-auto mb-2 animate-spin" />
              Preparing mock checkout session...
            </div>
          )}

          {!initializing && session && (
            <div className="retro-panel-inset p-3 mb-3">
              <div className="text-[11px] font-bold mb-1">What happens when you confirm?</div>
              <div className="text-[10px] text-gray-600 space-y-1">
                <div>- A mock payment is confirmed on the server</div>
                <div>- Developer Mode is activated for your account</div>
                <div>- A payment history entry is recorded for this plan</div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-2 bg-red-100 border border-red-400 text-red-800 text-[10px] px-2 py-1.5 rounded-sm">
              {error}
            </div>
          )}

          <button
            className="retro-button w-full font-bold text-[12px] mt-4 py-2 flex items-center justify-center gap-2"
            onClick={handleConfirm}
            disabled={loading || initializing || !session}
          >
            <Lock size={12} />
            {loading ? 'Confirming...' : `Confirm mock payment - $${price.toFixed(2)}`}
          </button>

          <div className="mt-2 flex items-center gap-1.5 text-[9px] text-gray-500 justify-center">
            <Lock size={9} />
            <span>Mock checkout only - no real card is charged</span>
          </div>
        </div>
      </div>
    </div>
  );
}
