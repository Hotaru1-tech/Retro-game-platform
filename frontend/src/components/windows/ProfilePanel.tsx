'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useWindowStore } from '@/stores/window.store';
import { useToastStore } from '@/components/Toast';
import { apiFetch, cn } from '@/lib/utils';
import { Trophy, Swords, Minus, Code, CreditCard, Check, Receipt } from 'lucide-react';
import PaymentModal from '@/components/PaymentModal';

export default function ProfilePanel() {
  const { user, isAuthenticated, fetchProfile } = useAuthStore();
  const { openWindow } = useWindowStore();
  const [devStatus, setDevStatus] = useState<{ isDeveloper: boolean; subscription: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<'monthly' | 'yearly' | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (isAuthenticated) loadDevStatus();
  }, [isAuthenticated]);

  const loadDevStatus = async () => {
    try {
      const data = await apiFetch('/api/developer/status');
      setDevStatus(data);
    } catch { /* ignore */ }
  };

  const loadPaymentHistory = async () => {
    try {
      const data = await apiFetch('/api/payments/history');
      setPayments(data);
    } catch { /* ignore */ }
  };

  const handlePaymentSuccess = (data: any) => {
    setDevStatus({ isDeveloper: true, subscription: data.subscription });
    setShowPlans(false);
    setPaymentPlan(null);
    fetchProfile();
    loadPaymentHistory();
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await apiFetch('/api/developer/cancel', { method: 'POST' });
      useToastStore.getState().addToast('Developer mode cancelled', 'info');
      setDevStatus({ isDeveloper: false, subscription: null });
      fetchProfile();
    } catch (err: any) {
      useToastStore.getState().addToast(err.message, 'error');
    }
    setLoading(false);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="p-4 text-center text-[11px] text-gray-500">
        Please log in to view your profile
      </div>
    );
  }

  const profile = user.profile || {};
  const rating = user.rating || { elo: 1200 };
  const totalGames = (profile.gamesWon || 0) + (profile.gamesLost || 0) + (profile.gamesDraw || 0);
  const winRate = totalGames > 0 ? Math.round(((profile.gamesWon || 0) / totalGames) * 100) : 0;
  const isDev = devStatus?.isDeveloper || false;
  const sub = devStatus?.subscription;

  return (
    <div className="p-3 bg-retro-window h-full overflow-y-auto">
      {/* User info */}
      <div className="retro-panel p-3 mb-3 flex items-center gap-3">
        <div className="w-14 h-14 bg-retro-title flex items-center justify-center text-white text-[20px] font-pixel">
          {user.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-[14px]">{user.username}</h2>
            {isDev && <span className="text-[8px] bg-purple-600 text-white px-1.5 py-0.5 rounded-sm font-bold">DEV</span>}
          </div>
          <p className="text-[10px] text-gray-500">{user.email}</p>
          {user.isGuest && <span className="text-[9px] bg-yellow-100 px-1">Guest</span>}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-1.5 mb-3 text-[11px]">
        <div className="retro-panel p-1.5 text-center">
          <div className="font-bold text-[14px] text-retro-title">{rating.elo}</div>
          <div className="text-[9px] text-gray-500">ELO</div>
        </div>
        <div className="retro-panel p-1.5 text-center">
          <div className="font-bold text-[14px] text-green-700">{profile.gamesWon || 0}</div>
          <div className="text-[9px] text-gray-500">Wins</div>
        </div>
        <div className="retro-panel p-1.5 text-center">
          <div className="font-bold text-[14px] text-red-700">{profile.gamesLost || 0}</div>
          <div className="text-[9px] text-gray-500">Losses</div>
        </div>
        <div className="retro-panel p-1.5 text-center">
          <div className="font-bold text-[14px] text-blue-700">{winRate}%</div>
          <div className="text-[9px] text-gray-500">Win Rate</div>
        </div>
      </div>

      {/* Developer Mode Section */}
      <div className="retro-panel-inset p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Code size={14} className="text-purple-700" />
          <h3 className="font-bold text-[11px]">Developer Mode</h3>
        </div>

        {user.isGuest ? (
          <p className="text-[10px] text-gray-500">Register a full account to access Developer Mode.</p>
        ) : isDev ? (
          <>
            <div className="retro-panel p-2 mb-2 bg-purple-50">
              <div className="flex items-center gap-1 text-[11px] text-purple-800 font-bold mb-1">
                <Check size={12} /> Developer Mode Active
              </div>
              <div className="text-[10px] text-gray-600">
                Plan: <span className="font-bold">{sub?.plan === 'yearly' ? 'Yearly' : 'Monthly'}</span>
                {' · '}
                ${sub?.price}/{sub?.plan === 'yearly' ? 'yr' : 'mo'}
              </div>
              {sub?.endDate && (
                <div className="text-[9px] text-gray-500 mt-0.5">
                  Expires: {new Date(sub.endDate).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="flex gap-2 mb-2">
              <button
                className="retro-button text-[10px] flex-1 font-bold"
                onClick={() => openWindow('dev-submit', 'My Submissions')}
              >
                My Submissions
              </button>
              <button
                className="retro-button text-[10px] flex-1"
                onClick={() => openWindow('dev-panel', 'Quick Upload')}
              >
                Quick Upload
              </button>
            </div>
            <button
              className="retro-button text-[10px] w-full !bg-red-50"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel Subscription
            </button>
          </>
        ) : (
          <>
            <p className="text-[10px] text-gray-600 mb-2">
              Upload and manage your own games on the platform. Choose a plan to get started.
            </p>
            {!showPlans ? (
              <button
                className="retro-button text-[10px] w-full font-bold flex items-center justify-center gap-1"
                onClick={() => setShowPlans(true)}
              >
                <CreditCard size={12} /> Enable Developer Mode
              </button>
            ) : (
              <div className="space-y-2">
                {/* Monthly plan */}
                <button
                  className="retro-panel p-2.5 w-full text-left hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                  onClick={() => setPaymentPlan('monthly')}
                >
                  <div>
                    <div className="font-bold text-[12px]">Monthly</div>
                    <div className="text-[9px] text-gray-500">Billed every month</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[16px] text-retro-title">$1.99</div>
                    <div className="text-[9px] text-gray-500">/month</div>
                  </div>
                </button>

                {/* Yearly plan */}
                <button
                  className="retro-panel p-2.5 w-full text-left hover:bg-green-50 cursor-pointer flex items-center justify-between border-2 border-green-500"
                  onClick={() => setPaymentPlan('yearly')}
                >
                  <div>
                    <div className="font-bold text-[12px] flex items-center gap-1">
                      Yearly <span className="text-[8px] bg-green-600 text-white px-1 py-0.5 rounded">SAVE 58%</span>
                    </div>
                    <div className="text-[9px] text-gray-500">Billed annually</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[16px] text-green-700">$9.99</div>
                    <div className="text-[9px] text-gray-500">/year</div>
                  </div>
                </button>

                <button
                  className="text-[10px] text-gray-500 underline w-full text-center"
                  onClick={() => setShowPlans(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment History */}
      {isAuthenticated && !user.isGuest && (
        <div className="retro-panel-inset p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <Receipt size={12} className="text-gray-600" />
              <h3 className="font-bold text-[11px]">Payment History</h3>
            </div>
            <button
              className="retro-button !min-w-0 !px-2 text-[9px]"
              onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadPaymentHistory(); }}
            >
              {showHistory ? 'Hide' : 'Show'}
            </button>
          </div>
          {showHistory && (
            payments.length === 0 ? (
              <p className="text-[10px] text-gray-500 text-center py-2">No payments yet</p>
            ) : (
              <div className="space-y-1 max-h-[120px] overflow-y-auto">
                {payments.map((p: any) => (
                  <div key={p.id} className="retro-panel px-2 py-1 flex items-center justify-between text-[10px]">
                    <div>
                      <span className="font-bold">${p.amount.toFixed(2)}</span>
                      <span className="text-gray-500 ml-1">
                        {p.method === 'card' ? `${p.cardBrand} ****${p.cardLast4}` : 'PayPal'}
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Payment Modal */}
      {paymentPlan && (
        <PaymentModal
          plan={paymentPlan}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPaymentPlan(null)}
        />
      )}
    </div>
  );
}
