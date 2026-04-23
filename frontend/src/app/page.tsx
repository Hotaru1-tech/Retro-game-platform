'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useWindowStore, type WindowState } from '@/stores/window.store';
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

type WindowProps = Record<string, unknown>;
type WindowRenderer = (props?: WindowProps) => JSX.Element;

const windowRenderers: Partial<Record<WindowState['type'], WindowRenderer>> = {
  'games-app': () => <GamesApp />,
  'game-library': () => <GameLibrary />,
  'matchmaking': () => <MatchmakingPanel />,
  'lobby': (props) => <LobbyPanel roomId={String(props?.roomId ?? '')} />,
  'chess': () => <ChessGame />,
  'local-chess': () => <LocalChessGame />,
  'tictactoe': () => <TicTacToe />,
  'snake': () => <SnakeGame />,
  'minesweeper': () => <Minesweeper />,
  'memory': () => <MemoryGame />,
  'settings': () => <LoginPanel />,
  'profile': () => <ProfilePanel />,
  'leaderboard': () => <LeaderboardPanel />,
  'dev-panel': () => <DevPanel />,
  'dev-submit': () => <DevSubmit />,
  'admin-review': () => <AdminReview />,
};

function WindowContent({ type, props }: { type: WindowState['type']; props?: WindowProps }) {
  const renderWindow = windowRenderers[type];
  if (!renderWindow) {
    return <div className="p-4 text-[11px]">Unknown window type</div>;
  }

  return renderWindow(props);
}

export default function Desktop() {
  const { isAuthenticated, isClerkLoaded } = useAuthStore();
  const { windows, openWindow, closeWindow } = useWindowStore();
  const [booted, setBooted] = useState(false);

  const handleBootComplete = useCallback(() => {
    setBooted(true);
  }, []);

  // Auto-open login if not authenticated, auto-close on login
  useEffect(() => {
    if (!booted || !isClerkLoaded) return;
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
  }, [booted, closeWindow, isAuthenticated, isClerkLoaded, openWindow, windows]);

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
