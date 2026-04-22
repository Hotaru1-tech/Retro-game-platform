'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToastStore } from '@/components/Toast';
import { apiFetch, cn } from '@/lib/utils';
import { Plus, Edit, Trash2, Eye, EyeOff, ExternalLink, Gamepad2 } from 'lucide-react';

interface CustomGame {
  id: string;
  title: string;
  description: string;
  icon: string;
  gameUrl: string;
  gameType: string;
  isPublished: boolean;
  plays: number;
  createdAt: string;
}

export default function DevPanel() {
  const [games, setGames] = useState<CustomGame[]>([]);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingGame, setEditingGame] = useState<CustomGame | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gameUrl, setGameUrl] = useState('');
  const [gameType, setGameType] = useState<'iframe' | 'link'>('iframe');
  const [icon, setIcon] = useState('Gamepad2');

  const loadGames = useCallback(async () => {
    try {
      const data = await apiFetch('/api/developer/games/mine');
      setGames(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadGames(); }, [loadGames]);

  const resetForm = () => {
    setTitle(''); setDescription(''); setGameUrl(''); setGameType('iframe'); setIcon('Gamepad2');
    setEditingGame(null);
  };

  const handleCreate = async () => {
    if (!title.trim() || !gameUrl.trim()) {
      useToastStore.getState().addToast('Title and Game URL are required', 'error');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/developer/games', {
        method: 'POST',
        body: JSON.stringify({ title, description, gameUrl, gameType, icon }),
      });
      useToastStore.getState().addToast('Game created!', 'success');
      resetForm();
      setView('list');
      loadGames();
    } catch (err: any) {
      useToastStore.getState().addToast(err.message, 'error');
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (!editingGame) return;
    setLoading(true);
    try {
      await apiFetch(`/api/developer/games/${editingGame.id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, description, gameUrl, gameType, icon }),
      });
      useToastStore.getState().addToast('Game updated!', 'success');
      resetForm();
      setView('list');
      loadGames();
    } catch (err: any) {
      useToastStore.getState().addToast(err.message, 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this game?')) return;
    try {
      await apiFetch(`/api/developer/games/${id}`, { method: 'DELETE' });
      useToastStore.getState().addToast('Game deleted', 'info');
      loadGames();
    } catch (err: any) {
      useToastStore.getState().addToast(err.message, 'error');
    }
  };

  const handleTogglePublish = async (game: CustomGame) => {
    try {
      await apiFetch(`/api/developer/games/${game.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isPublished: !game.isPublished }),
      });
      useToastStore.getState().addToast(
        game.isPublished ? 'Game unpublished' : 'Game published!',
        game.isPublished ? 'info' : 'success'
      );
      loadGames();
    } catch (err: any) {
      useToastStore.getState().addToast(err.message, 'error');
    }
  };

  const startEdit = (game: CustomGame) => {
    setEditingGame(game);
    setTitle(game.title);
    setDescription(game.description);
    setGameUrl(game.gameUrl);
    setGameType(game.gameType as 'iframe' | 'link');
    setIcon(game.icon);
    setView('edit');
  };

  // --- Form UI ---
  const renderForm = () => (
    <div className="p-3 space-y-3">
      <div>
        <label className="text-[11px] block mb-0.5 font-bold">Game Title *</label>
        <input className="retro-input w-full" value={title} onChange={e => setTitle(e.target.value)} placeholder="My Awesome Game" maxLength={50} />
      </div>
      <div>
        <label className="text-[11px] block mb-0.5 font-bold">Description</label>
        <input className="retro-input w-full" value={description} onChange={e => setDescription(e.target.value)} placeholder="A fun game about..." maxLength={200} />
      </div>
      <div>
        <label className="text-[11px] block mb-0.5 font-bold">Game URL *</label>
        <input className="retro-input w-full" value={gameUrl} onChange={e => setGameUrl(e.target.value)} placeholder="https://your-game.com/embed" />
        <p className="text-[9px] text-gray-500 mt-0.5">URL to your game (will be loaded in an iframe or opened as link)</p>
      </div>
      <div>
        <label className="text-[11px] block mb-0.5 font-bold">Type</label>
        <div className="flex gap-2">
          <button
            className={cn('retro-button text-[10px] !min-w-0 !px-3', gameType === 'iframe' && 'font-bold shadow-retro-button-pressed')}
            onClick={() => setGameType('iframe')}
          >
            Embed (iframe)
          </button>
          <button
            className={cn('retro-button text-[10px] !min-w-0 !px-3', gameType === 'link' && 'font-bold shadow-retro-button-pressed')}
            onClick={() => setGameType('link')}
          >
            External Link
          </button>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button className="retro-button font-bold text-[10px] flex-1" onClick={view === 'edit' ? handleUpdate : handleCreate} disabled={loading}>
          {loading ? 'Saving...' : view === 'edit' ? 'Save Changes' : 'Create Game'}
        </button>
        <button className="retro-button text-[10px]" onClick={() => { resetForm(); setView('list'); }}>
          Cancel
        </button>
      </div>
    </div>
  );

  // --- List UI ---
  const renderList = () => (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-[12px]">My Games ({games.length})</h3>
          <p className="text-[9px] text-gray-500">Create and manage your games</p>
        </div>
        <button className="retro-button text-[10px] flex items-center gap-1 font-bold" onClick={() => { resetForm(); setView('create'); }}>
          <Plus size={10} /> Add Game
        </button>
      </div>

      {games.length === 0 ? (
        <div className="retro-panel-inset p-6 text-center">
          <Gamepad2 size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-[11px] text-gray-500">No games yet</p>
          <p className="text-[9px] text-gray-400">Click "Add Game" to upload your first game</p>
        </div>
      ) : (
        <div className="space-y-2">
          {games.map(game => (
            <div key={game.id} className="retro-panel p-2.5 flex items-center gap-2">
              <div className="w-9 h-9 bg-retro-title flex items-center justify-center flex-shrink-0 rounded-sm">
                <Gamepad2 size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[11px] truncate">{game.title}</span>
                  <span className={cn(
                    'text-[8px] px-1 py-0.5 rounded-sm',
                    game.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  )}>
                    {game.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="text-[9px] text-gray-500">{game.plays} plays · {game.gameType}</div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button className="retro-window-button !w-6 !h-5" onClick={() => handleTogglePublish(game)} title={game.isPublished ? 'Unpublish' : 'Publish'}>
                  {game.isPublished ? <EyeOff size={10} /> : <Eye size={10} />}
                </button>
                <button className="retro-window-button !w-6 !h-5" onClick={() => startEdit(game)} title="Edit">
                  <Edit size={10} />
                </button>
                <button className="retro-window-button !w-6 !h-5" onClick={() => handleDelete(game.id)} title="Delete">
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-retro-window">
      {/* Header */}
      <div className="retro-panel-inset mx-3 mt-3 p-2 flex items-center gap-2">
        <div className="w-8 h-8 bg-purple-700 flex items-center justify-center rounded-sm">
          <Gamepad2 size={18} className="text-white" />
        </div>
        <div>
          <h2 className="font-pixel text-[10px] text-purple-800">Developer Panel</h2>
          <p className="text-[9px] text-gray-500">Create and manage your games</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'list' && renderList()}
        {(view === 'create' || view === 'edit') && (
          <>
            <div className="px-3 pt-3">
              <h3 className="font-bold text-[12px]">{view === 'edit' ? 'Edit Game' : 'Add New Game'}</h3>
            </div>
            {renderForm()}
          </>
        )}
      </div>
    </div>
  );
}
