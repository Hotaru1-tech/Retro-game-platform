'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToastStore } from '@/components/Toast';
import { apiFetch, cn } from '@/lib/utils';
import { Plus, Edit, Trash2, Eye, EyeOff, Send, ArrowLeft, Gamepad2, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

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
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
  DISABLED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertTriangle },
};

export default function DevSubmit() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [view, setView] = useState<'list' | 'submit' | 'edit'>('list');
  const [editing, setEditing] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [gameUrl, setGameUrl] = useState('');
  const [mode, setMode] = useState<'singleplayer' | 'multiplayer' | 'both'>('singleplayer');
  const [minPlayers, setMinPlayers] = useState(1);
  const [maxPlayers, setMaxPlayers] = useState(1);
  const [scanErrors, setScanErrors] = useState<string[]>([]);

  const loadSubmissions = useCallback(async () => {
    try {
      const data = await apiFetch('/api/submissions/my-games');
      setSubmissions(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  const resetForm = () => {
    setName(''); setSlug(''); setDescription(''); setVersion('1.0.0');
    setGameUrl(''); setMode('singleplayer'); setMinPlayers(1); setMaxPlayers(1);
    setEditing(null); setScanErrors([]);
  };

  const autoSlug = (val: string) => {
    setName(val);
    if (!editing) setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim() || !gameUrl.trim()) {
      useToastStore.getState().addToast('Name, slug, and game URL are required', 'error');
      return;
    }
    setLoading(true);
    setScanErrors([]);
    try {
      const body = { name, slug, description, version, gameUrl, mode, minPlayers, maxPlayers };
      const data = editing
        ? await apiFetch(`/api/submissions/my-games/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await apiFetch('/api/submissions/submit', { method: 'POST', body: JSON.stringify(body) });

      if (data.scanResult && !data.scanResult.passed) {
        setScanErrors(data.scanResult.errors || []);
        useToastStore.getState().addToast('Security scan found issues', 'error');
      } else {
        useToastStore.getState().addToast(editing ? 'Game updated & resubmitted!' : 'Game submitted for review!', 'success');
        resetForm();
        setView('list');
        loadSubmissions();
      }
    } catch (err: any) {
      useToastStore.getState().addToast(err.message, 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this submission?')) return;
    try {
      await apiFetch(`/api/submissions/my-games/${id}`, { method: 'DELETE' });
      useToastStore.getState().addToast('Submission deleted', 'info');
      loadSubmissions();
    } catch (err: any) {
      useToastStore.getState().addToast(err.message, 'error');
    }
  };

  const startEdit = (sub: Submission) => {
    setEditing(sub);
    setName(sub.name); setSlug(sub.slug); setDescription(sub.description);
    setVersion(sub.version); setGameUrl(sub.gameUrl);
    setMode(sub.mode as any); setScanErrors([]);
    setView('edit');
  };

  // Form view
  if (view === 'submit' || view === 'edit') {
    return (
      <div className="flex flex-col h-full bg-retro-window">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-400">
          <button className="retro-button !min-w-0 !px-2 text-[10px] flex items-center gap-1" onClick={() => { resetForm(); setView('list'); }}>
            <ArrowLeft size={10} /> Back
          </button>
          <span className="font-bold text-[11px]">{view === 'edit' ? 'Edit Submission' : 'Submit New Game'}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          <div>
            <label className="text-[11px] block mb-0.5 font-bold">Game Name *</label>
            <input className="retro-input w-full" value={name} onChange={e => autoSlug(e.target.value)} maxLength={50} />
          </div>
          <div>
            <label className="text-[11px] block mb-0.5 font-bold">Slug *</label>
            <input className="retro-input w-full" value={slug} onChange={e => setSlug(e.target.value)} maxLength={50} placeholder="my-game-name" />
            <p className="text-[9px] text-gray-500">URL-friendly name (lowercase, hyphens only)</p>
          </div>
          <div>
            <label className="text-[11px] block mb-0.5 font-bold">Description</label>
            <textarea className="retro-input w-full h-14 resize-none" value={description} onChange={e => setDescription(e.target.value)} maxLength={500} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] block mb-0.5 font-bold">Version</label>
              <input className="retro-input w-full" value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0.0" />
            </div>
            <div className="flex-1">
              <label className="text-[11px] block mb-0.5 font-bold">Mode</label>
              <select className="retro-input w-full" value={mode} onChange={e => setMode(e.target.value as any)}>
                <option value="singleplayer">Single Player</option>
                <option value="multiplayer">Multiplayer</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] block mb-0.5 font-bold">Game URL *</label>
            <input className="retro-input w-full" value={gameUrl} onChange={e => setGameUrl(e.target.value)} placeholder="https://your-game.com/embed" />
            <p className="text-[9px] text-gray-500">URL to your hosted game (HTML5). Will be embedded in an iframe.</p>
          </div>
          {mode !== 'singleplayer' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] block mb-0.5 font-bold">Min Players</label>
                <input type="number" className="retro-input w-full" value={minPlayers} onChange={e => setMinPlayers(+e.target.value)} min={1} max={100} />
              </div>
              <div className="flex-1">
                <label className="text-[11px] block mb-0.5 font-bold">Max Players</label>
                <input type="number" className="retro-input w-full" value={maxPlayers} onChange={e => setMaxPlayers(+e.target.value)} min={1} max={100} />
              </div>
            </div>
          )}

          {scanErrors.length > 0 && (
            <div className="retro-panel-inset p-2 bg-red-50 border border-red-300">
              <div className="flex items-center gap-1 text-[11px] text-red-800 font-bold mb-1"><AlertTriangle size={12} /> Security Issues Found</div>
              {scanErrors.map((e, i) => <div key={i} className="text-[9px] text-red-700">- {e}</div>)}
            </div>
          )}

          <button className="retro-button w-full font-bold text-[11px] flex items-center justify-center gap-1" onClick={handleSubmit} disabled={loading}>
            <Send size={12} /> {loading ? 'Submitting...' : view === 'edit' ? 'Resubmit for Review' : 'Submit for Review'}
          </button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col h-full bg-retro-window">
      <div className="p-3 flex items-center justify-between border-b border-gray-300">
        <div>
          <h3 className="font-bold text-[12px]">My Submissions ({submissions.length})</h3>
          <p className="text-[9px] text-gray-500">Submit games for admin review</p>
        </div>
        <button className="retro-button text-[10px] flex items-center gap-1 font-bold" onClick={() => { resetForm(); setView('submit'); }}>
          <Plus size={10} /> Submit Game
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {submissions.length === 0 ? (
          <div className="retro-panel-inset p-6 text-center">
            <Gamepad2 size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-[11px] text-gray-500">No submissions yet</p>
            <p className="text-[9px] text-gray-400">Submit your first game for review</p>
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.map(sub => {
              const st = STATUS_STYLES[sub.status] || STATUS_STYLES.PENDING;
              const StIcon = st.icon;
              return (
                <div key={sub.id} className="retro-panel p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[11px] flex-1 truncate">{sub.name}</span>
                    <span className={cn('text-[8px] px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 font-bold', st.bg, st.text)}>
                      <StIcon size={9} /> {sub.status}
                    </span>
                  </div>
                  <div className="text-[9px] text-gray-500 mb-1">v{sub.version} · {sub.mode} · {sub.plays} plays</div>
                  {sub.rejectReason && <div className="text-[9px] text-red-600 mb-1">Reason: {sub.rejectReason}</div>}
                  <div className="flex gap-1">
                    {(sub.status === 'PENDING' || sub.status === 'REJECTED') && (
                      <button className="retro-button !min-w-0 !px-2 text-[9px] flex items-center gap-0.5" onClick={() => startEdit(sub)}>
                        <Edit size={9} /> Edit
                      </button>
                    )}
                    <button className="retro-button !min-w-0 !px-2 text-[9px] flex items-center gap-0.5" onClick={() => handleDelete(sub.id)}>
                      <Trash2 size={9} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
