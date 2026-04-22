'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useWindowStore } from '@/stores/window.store';
import Window from '@/components/Window';
import Taskbar from '@/components/Taskbar';
import DesktopIcons from '@/components/DesktopIcons';
import GameLibrary from '@/components/windows/GameLibrary';
import MatchmakingPanel from '@/components/windows/MatchmakingPanel';
import LobbyPanel from '@/components/windows/LobbyPanel';
import ChessGame from '@/components/windows/ChessGame';
import LoginPanel from '@/components/windows/LoginPanel';
import ProfilePanel from '@/components/windows/ProfilePanel';
import LeaderboardPanel from '@/components/windows/LeaderboardPanel';
import LocalChessGame from '@/components/windows/LocalChessGame';
import TicTacToe from '@/components/windows/TicTacToe';
import SnakeGame from '@/components/windows/SnakeGame';
import Minesweeper from '@/components/windows/Minesweeper';
import MemoryGame from '@/components/windows/MemoryGame';
import ToastContainer from '@/components/Toast';
import BootScreen from '@/components/BootScreen';
import GamesApp from '@/components/windows/GamesApp';
import DevPanel from '@/components/windows/DevPanel';
import DevSubmit from '@/components/windows/DevSubmit';
import AdminReview from '@/components/windows/AdminReview';

function WindowContent({ type, props }: { type: string; props?: Record<string, any> }) {
  switch (type) {
    case 'games-app':
      return <GamesApp />;
    case 'game-library':
      return <GameLibrary />;
    case 'matchmaking':
      return <MatchmakingPanel />;
    case 'lobby':
      return <LobbyPanel roomId={props?.roomId} />;
    case 'chess':
      return <ChessGame />;
    case 'local-chess':
      return <LocalChessGame />;
    case 'tictactoe':
      return <TicTacToe />;
    case 'snake':
      return <SnakeGame />;
    case 'minesweeper':
      return <Minesweeper />;
    case 'memory':
      return <MemoryGame />;
    case 'settings':
      return <LoginPanel />;
    case 'profile':
      return <ProfilePanel />;
    case 'leaderboard':
      return <LeaderboardPanel />;
    case 'dev-panel':
      return <DevPanel />;
    case 'dev-submit':
      return <DevSubmit />;
    case 'admin-review':
      return <AdminReview />;
    default:
      return <div className="p-4 text-[11px]">Unknown window type</div>;
  }
}

export default function Desktop() {
  const { loadFromStorage, isAuthenticated } = useAuthStore();
  const { windows, openWindow, closeWindow } = useWindowStore();
  const [booted, setBooted] = useState(false);

  const handleBootComplete = useCallback(() => {
    setBooted(true);
  }, []);

  useEffect(() => {
    if (booted) loadFromStorage();
  }, [booted]);

  // Auto-open login if not authenticated, auto-close on login
  useEffect(() => {
    if (!booted) return;
    if (!isAuthenticated) {
      const hasLoginWindow = windows.some(w => w.type === 'settings');
      if (!hasLoginWindow) {
        openWindow('settings', 'Welcome - Login');
      }
    } else {
      const loginWindow = windows.find(w => w.type === 'settings');
      if (loginWindow) {
        closeWindow(loginWindow.id);
      }
    }
  }, [isAuthenticated, booted]);

  if (!booted) {
    return <BootScreen onComplete={handleBootComplete} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden relative xp-desktop">
      {/* Desktop icons */}
      <DesktopIcons />

      {/* Windows */}
      {windows.map(win => (
        <Window key={win.id} window={win}>
          <WindowContent type={win.type} props={win.props} />
        </Window>
      ))}

      {/* Taskbar */}
      <Taskbar />

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}
