'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToastStore } from '@/components/Toast';
import { apiFetch, cn } from '@/lib/utils';
import { CheckCircle, XCircle, Ban, Clock, ExternalLink, Shield, User, Gamepad2 } from 'lucide-react';

interface Submission {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  gameUrl: string;
  mode: string;
  status: string;
  scanResult: string;
  rejectReason: string | null;
  plays: number;
  createdAt: string;
  developer?: { id: string; username: string; email?: string };
}

export default function AdminReview() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const url = tab === 'pending' ? '/api/submissions/admin/pending' : '/api/submissions/admin/all';
      const data = await apiFetch(url);
      setSubmissions(data);
    } catch (err: any) {
      useToastStore.getState().addToast(err.message, 'error');
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (id: string, action: 'APPROVED' | 'REJECTED' | 'DISABLED') => {
    setLoading(true);
    try {
      await apiFetch(`/api/submissions/admin/review/${id}`, {
        method: 'POST',
        body: JSON.stringify({ action, comment }),
      });
      useToastStore.getState().addToast(`Game ${action.toLowerCase()}!`, action === 'APPROVED' ? 'success' : 'info');
      setSelected(null);
      setComment('');
      load();
    } catch (err: any) {
      useToastStore.getState().addToast(err.message, 'error');
    }
    setLoading(false);
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    DISABLED: 'bg-gray-200 text-gray-700',
  };

  // Detail view
  if (selected) {
    let scan: any = {};
    try { scan = JSON.parse(selected.scanResult); } catch {}

    return (
      <div className="flex flex-col h-full bg-retro-window">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-400">
          <button className="retro-button !min-w-0 !px-2 text-[10px]" onClick={() => setSelected(null)}>Back</button>
          <span className="font-bold text-[11px]">Review: {selected.name}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Info */}
          <div className="retro-panel p-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-[12px]">{selected.name}</span>
              <span className={cn('text-[8px] px-1.5 py-0.5 rounded-sm font-bold', STATUS_COLORS[selected.status])}>
                {selected.status}
              </span>
            </div>
            <div className="text-[10px] text-gray-600">{selected.description || 'No description'}</div>
            <div className="text-[9px] text-gray-500 mt-1">
              v{selected.version} · {selected.mode} · slug: {selected.slug}
            </div>
            {selected.developer && (
              <div className="flex items-center gap-1 text-[9px] text-purple-600 mt-1">
                <User size={9} /> {selected.developer.username}
              </div>
            )}
          </div>

          {/* Game URL */}
          <div className="retro-panel-inset p-2">
            <div className="text-[10px] font-bold mb-1">Game URL</div>
            <a href={selected.gameUrl} target="_blank" rel="noopener" className="text-[10px] text-blue-700 underline flex items-center gap-1">
              {selected.gameUrl} <ExternalLink size={9} />
            </a>
          </div>

          {/* Security Scan */}
          <div className={cn('retro-panel-inset p-2', scan.passed ? 'bg-green-50' : 'bg-red-50')}>
            <div className="flex items-center gap-1 text-[10px] font-bold mb-1">
              <Shield size={10} /> Security Scan: {scan.passed ? 'PASSED' : 'FAILED'}
            </div>
            {scan.errors?.length > 0 && (
              <div className="space-y-0.5">
                {scan.errors.map((e: string, i: number) => (
                  <div key={i} className="text-[9px] text-red-700">- {e}</div>
                ))}
              </div>
            )}
            {scan.warnings?.length > 0 && (
              <div className="space-y-0.5 mt-1">
                {scan.warnings.map((w: string, i: number) => (
                  <div key={i} className="text-[9px] text-yellow-700">- {w}</div>
                ))}
              </div>
            )}
            {scan.passed && scan.errors?.length === 0 && scan.warnings?.length === 0 && (
              <div className="text-[9px] text-green-700">No issues found</div>
            )}
          </div>

          {/* Review actions */}
          {selected.status === 'PENDING' && (
            <div className="retro-panel p-2 space-y-2">
              <div className="text-[10px] font-bold">Review Actions</div>
              <textarea
                className="retro-input w-full h-12 resize-none text-[10px]"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Optional comment for the developer..."
              />
              <div className="flex gap-2">
                <button
                  className="retro-button flex-1 text-[10px] font-bold flex items-center justify-center gap-1 !bg-green-50"
                  onClick={() => handleReview(selected.id, 'APPROVED')}
                  disabled={loading}
                >
                  <CheckCircle size={10} /> Approve
                </button>
                <button
                  className="retro-button flex-1 text-[10px] font-bold flex items-center justify-center gap-1 !bg-red-50"
                  onClick={() => handleReview(selected.id, 'REJECTED')}
                  disabled={loading}
                >
                  <XCircle size={10} /> Reject
                </button>
              </div>
            </div>
          )}

          {selected.status === 'APPROVED' && (
            <button
              className="retro-button w-full text-[10px] flex items-center justify-center gap-1"
              onClick={() => handleReview(selected.id, 'DISABLED')}
              disabled={loading}
            >
              <Ban size={10} /> Disable Game
            </button>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col h-full bg-retro-window">
      <div className="p-3 border-b border-gray-300">
        <div className="retro-panel-inset p-2 flex items-center gap-2 mb-2">
          <Shield size={16} className="text-red-700" />
          <div>
            <h2 className="font-pixel text-[10px] text-red-800">Admin Review</h2>
            <p className="text-[9px] text-gray-500">Review and approve game submissions</p>
          </div>
        </div>
        <div className="flex gap-0">
          <button className={cn('px-3 py-0.5 text-[10px] border border-gray-400', tab === 'pending' ? 'bg-white font-bold' : 'bg-retro-button')} onClick={() => setTab('pending')}>
            Pending
          </button>
          <button className={cn('px-3 py-0.5 text-[10px] border border-gray-400', tab === 'all' ? 'bg-white font-bold' : 'bg-retro-button')} onClick={() => setTab('all')}>
            All
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {submissions.length === 0 ? (
          <div className="retro-panel-inset p-6 text-center">
            <Clock size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-[11px] text-gray-500">{tab === 'pending' ? 'No pending submissions' : 'No submissions'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.map(sub => (
              <button
                key={sub.id}
                className="retro-panel p-2.5 w-full text-left hover:bg-blue-50 cursor-pointer flex items-center gap-2"
                onClick={() => setSelected(sub)}
              >
                <div className="w-9 h-9 bg-retro-title flex items-center justify-center flex-shrink-0 rounded-sm">
                  <Gamepad2 size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[11px] truncate">{sub.name}</span>
                    <span className={cn('text-[8px] px-1 py-0.5 rounded-sm font-bold', STATUS_COLORS[sub.status])}>
                      {sub.status}
                    </span>
                  </div>
                  <div className="text-[9px] text-gray-500">
                    by {sub.developer?.username || '?'} · v{sub.version} · {new Date(sub.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
