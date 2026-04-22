'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/game.store';
import { useWindowStore } from '@/stores/window.store';
import { useAuthStore } from '@/stores/auth.store';
import { apiFetch } from '@/lib/utils';
import { Loader2, Swords, Users } from 'lucide-react';

export default function MatchmakingPanel() {
  const { isInQueue, joinQueue, leaveQueue, roomId, status, setupListeners, cleanup } = useGameStore();
  const { openWindow, closeWindow } = useWindowStore();
  const { isAuthenticated } = useAuthStore();
  const [roomCode, setRoomCode] = useState('');
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [tab, setTab] = useState<'quick' | 'create' | 'join' | 'browse'>('quick');

  useEffect(() => {
    setupListeners();
    loadRooms();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (roomId && status === 'waiting') {
      openWindow('lobby', `Game Lobby`, { roomId });
    }
  }, [roomId, status]);

  const loadRooms = async () => {
    try {
      const rooms = await apiFetch('/api/rooms/active');
      setActiveRooms(rooms);
    } catch { /* ignore */ }
  };

  const handleCreateRoom = async () => {
    try {
      const room = await apiFetch('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ gameType: 'chess' }),
      });
      useGameStore.getState().joinRoom(room.id);
    } catch (err: any) {
      useGameStore.getState().setError(err.message);
    }
  };

  const handleJoinByCode = async () => {
    if (!roomCode.trim()) return;
    try {
      const room = await apiFetch(`/api/rooms/code/${roomCode.trim()}`);
      useGameStore.getState().joinRoom(room.id);
    } catch (err: any) {
      useGameStore.getState().setError(err.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 text-center">
        <p className="text-[11px] mb-2">Please log in to play</p>
        <button className="retro-button" onClick={() => openWindow('settings', 'Login')}>
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 bg-retro-window h-full flex flex-col">
      {/* Tabs */}
      <div className="flex gap-0 mb-3">
        {(['quick', 'create', 'join', 'browse'] as const).map(t => (
          <button
            key={t}
            className={`px-3 py-1 text-[11px] border border-gray-400 ${tab === t ? 'bg-white border-b-white font-bold -mb-[1px] relative z-10' : 'bg-retro-button'}`}
            onClick={() => setTab(t)}
          >
            {t === 'quick' ? 'Quick Match' : t === 'create' ? 'Create' : t === 'join' ? 'Join' : 'Browse'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="retro-panel-inset p-3 flex-1">
        {tab === 'quick' && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Swords size={40} className="text-retro-title" />
            <p className="text-[11px] text-center">Find an opponent automatically based on your rating</p>
            {isInQueue ? (
              <>
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-[11px]">Searching for opponent...</span>
                </div>
                <button className="retro-button" onClick={leaveQueue}>Cancel</button>
              </>
            ) : (
              <button className="retro-button font-bold" onClick={joinQueue}>
                Find Match
              </button>
            )}
          </div>
        )}

        {tab === 'create' && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-[11px]">Create a private room and share the code</p>
            <button className="retro-button font-bold" onClick={handleCreateRoom}>
              Create Room
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-[11px]">Enter a room code to join</p>
            <div className="flex gap-2">
              <input
                className="retro-input w-32 uppercase"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value)}
                placeholder="ROOM CODE"
                maxLength={8}
              />
              <button className="retro-button" onClick={handleJoinByCode}>Join</button>
            </div>
          </div>
        )}

        {tab === 'browse' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold">Active Rooms</span>
              <button className="retro-button text-[10px] !min-w-0 !px-2" onClick={loadRooms}>Refresh</button>
            </div>
            {activeRooms.length === 0 ? (
              <p className="text-[10px] text-gray-500 text-center py-4">No active rooms</p>
            ) : (
              activeRooms.map(room => (
                <div key={room.id} className="retro-panel p-2 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold">{room.code}</span>
                    <span className="text-[10px] text-gray-500 ml-2">
                      <Users size={10} className="inline" /> {room.players?.length || 0}/{room.maxPlayers}
                    </span>
                  </div>
                  <button
                    className="retro-button text-[10px] !min-w-0 !px-2"
                    onClick={() => useGameStore.getState().joinRoom(room.id)}
                  >
                    Join
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
