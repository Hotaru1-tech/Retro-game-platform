'use client';

import { useState, useEffect } from 'react';
import { useWindowStore } from '@/stores/window.store';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { Monitor, Gamepad2, Trophy, User, Settings, LogOut, Swords } from 'lucide-react';

export default function Taskbar() {
  const { windows, focusWindow, restoreWindow, minimizeWindow } = useWindowStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [time, setTime] = useState('');
  const [showStartMenu, setShowStartMenu] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTaskClick = (windowId: string, isMinimized: boolean, isFocused: boolean) => {
    if (isMinimized) {
      restoreWindow(windowId);
    } else if (isFocused) {
      minimizeWindow(windowId);
    } else {
      focusWindow(windowId);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[40px] bg-retro-taskbar z-[10000] flex items-center px-[2px] gap-[2px]"
      style={{ boxShadow: 'inset 0 1px 0 #ffffff, inset 0 2px 0 #dfdfdf' }}>
      {/* Start button */}
      <button
        className={cn(
          'retro-button flex items-center gap-1 h-[28px] px-2 font-bold text-[11px] min-w-0',
          showStartMenu && 'shadow-retro-button-pressed'
        )}
        onClick={() => setShowStartMenu(!showStartMenu)}
      >
        <Monitor size={14} />
        <span>Start</span>
      </button>

      {/* Divider */}
      <div className="w-[2px] h-[24px] bg-[#808080] border-r border-white" />

      {/* Task buttons */}
      <div className="flex-1 flex gap-[2px] overflow-x-auto">
        {windows.map(win => (
          <button
            key={win.id}
            className={cn(
              'h-[28px] px-2 flex items-center gap-1 text-[11px] min-w-[120px] max-w-[160px] truncate',
              win.isFocused && !win.isMinimized
                ? 'bg-retro-button shadow-retro-button-pressed font-bold'
                : 'retro-button'
            )}
            onClick={() => handleTaskClick(win.id, win.isMinimized, win.isFocused)}
          >
            <TaskIcon type={win.type} />
            <span className="truncate">{win.title}</span>
          </button>
        ))}
      </div>

      {/* System tray */}
      <div className="retro-panel-inset h-[28px] px-2 flex items-center gap-2 text-[11px] min-w-[80px] justify-end">
        {isAuthenticated && (
          <span className="text-[10px] text-gray-600 truncate max-w-[80px]">{user?.username}</span>
        )}
        <span>{time}</span>
      </div>

      {/* Start Menu */}
      {showStartMenu && (
        <StartMenu onClose={() => setShowStartMenu(false)} />
      )}
    </div>
  );
}

function TaskIcon({ type }: { type: string }) {
  const size = 12;
  switch (type) {
    case 'game-library': return <Gamepad2 size={size} />;
    case 'chess': return <Swords size={size} />;
    case 'leaderboard': return <Trophy size={size} />;
    case 'profile': return <User size={size} />;
    case 'settings': return <Settings size={size} />;
    default: return <Monitor size={size} />;
  }
}

function StartMenu({ onClose }: { onClose: () => void }) {
  const { openWindow } = useWindowStore();
  const { isAuthenticated, logout, user } = useAuthStore();

  const menuItems = [
    { icon: Gamepad2, label: 'Game Library', action: () => openWindow('game-library', 'Game Library') },
    { icon: Swords, label: 'Quick Match', action: () => openWindow('matchmaking', 'Quick Match') },
    { icon: Trophy, label: 'Leaderboard', action: () => openWindow('leaderboard', 'Leaderboard') },
    { icon: User, label: 'Profile', action: () => openWindow('profile', 'My Profile') },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div className="absolute bottom-[40px] left-0 z-[9999] bg-retro-window border-t-[2px] border-l-[2px] border-white border-b-[2px] border-r-[2px] border-b-black border-r-black min-w-[200px]">
        {/* Header */}
        <div className="bg-retro-title px-2 py-3 flex items-center gap-2">
          <div className="w-8 h-8 bg-retro-button shadow-retro-button flex items-center justify-center">
            <Gamepad2 size={20} className="text-retro-title" />
          </div>
          <div>
            <div className="text-white font-bold text-[12px]">RetroPlay</div>
            <div className="text-blue-200 text-[10px]">{user?.username || 'Guest'}</div>
          </div>
        </div>

        {/* Menu items */}
        <div className="py-1">
          {menuItems.map((item, i) => (
            <button
              key={i}
              className="w-full flex items-center gap-3 px-4 py-1.5 text-[11px] hover:bg-retro-highlight hover:text-white text-left"
              onClick={() => { item.action(); onClose(); }}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}

          <div className="border-t border-[#808080] my-1 mx-2" />

          {isAuthenticated ? (
            <button
              className="w-full flex items-center gap-3 px-4 py-1.5 text-[11px] hover:bg-retro-highlight hover:text-white text-left"
              onClick={() => { logout(); onClose(); }}
            >
              <LogOut size={16} />
              Log Out
            </button>
          ) : (
            <button
              className="w-full flex items-center gap-3 px-4 py-1.5 text-[11px] hover:bg-retro-highlight hover:text-white text-left"
              onClick={() => { openWindow('settings', 'Login'); onClose(); }}
            >
              <User size={16} />
              Log In
            </button>
          )}
        </div>
      </div>
    </>
  );
}
