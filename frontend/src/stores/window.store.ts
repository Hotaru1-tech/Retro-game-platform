import { create } from 'zustand';

export interface WindowState {
  id: string;
  title: string;
  type: 'games-app' | 'game-library' | 'chess' | 'local-chess' | 'tictactoe' | 'snake' | 'minesweeper' | 'memory' | 'profile' | 'leaderboard' | 'settings' | 'chat' | 'lobby' | 'matchmaking' | 'dev-panel' | 'dev-submit' | 'admin-review';
  isMinimized: boolean;
  isMaximized: boolean;
  isFocused: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  props?: Record<string, any>;
}

interface WindowStore {
  windows: WindowState[];
  nextZIndex: number;

  openWindow: (type: WindowState['type'], title: string, props?: Record<string, any>) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updatePosition: (id: string, position: { x: number; y: number }) => void;
  updateSize: (id: string, size: { width: number; height: number }) => void;
}

let windowCounter = 0;

const defaultSizes: Record<string, { width: number; height: number }> = {
  'games-app': { width: 650, height: 550 },
  'dev-panel': { width: 600, height: 500 },
  'dev-submit': { width: 550, height: 550 },
  'admin-review': { width: 600, height: 550 },
  'game-library': { width: 600, height: 450 },
  'chess': { width: 700, height: 600 },
  'local-chess': { width: 700, height: 600 },
  'tictactoe': { width: 340, height: 480 },
  'snake': { width: 460, height: 560 },
  'minesweeper': { width: 520, height: 560 },
  'memory': { width: 500, height: 550 },
  'profile': { width: 450, height: 400 },
  'leaderboard': { width: 500, height: 500 },
  'settings': { width: 400, height: 300 },
  'chat': { width: 350, height: 400 },
  'lobby': { width: 550, height: 450 },
  'matchmaking': { width: 400, height: 350 },
};

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  nextZIndex: 100,

  openWindow: (type, title, props) => {
    const existing = get().windows.find(w => w.type === type && !w.props?.roomId);
    if (existing && type !== 'chat') {
      get().focusWindow(existing.id);
      if (existing.isMinimized) get().restoreWindow(existing.id);
      return;
    }

    const id = `window-${++windowCounter}`;
    const size = defaultSizes[type] || { width: 500, height: 400 };
    const offset = (windowCounter % 5) * 30;
    const position = { x: 80 + offset, y: 50 + offset };

    const newWindow: WindowState = {
      id,
      title,
      type,
      isMinimized: false,
      isMaximized: false,
      isFocused: true,
      position,
      size,
      zIndex: get().nextZIndex,
      props,
    };

    set(state => ({
      windows: [
        ...state.windows.map(w => ({ ...w, isFocused: false })),
        newWindow,
      ],
      nextZIndex: state.nextZIndex + 1,
    }));
  },

  closeWindow: (id) => {
    set(state => ({
      windows: state.windows.filter(w => w.id !== id),
    }));
  },

  minimizeWindow: (id) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id ? { ...w, isMinimized: true, isFocused: false } : w
      ),
    }));
  },

  maximizeWindow: (id) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id ? { ...w, isMaximized: true } : w
      ),
    }));
  },

  restoreWindow: (id) => {
    const store = get();
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id
          ? { ...w, isMinimized: false, isMaximized: false, isFocused: true, zIndex: store.nextZIndex }
          : { ...w, isFocused: false }
      ),
      nextZIndex: state.nextZIndex + 1,
    }));
  },

  focusWindow: (id) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id
          ? { ...w, isFocused: true, zIndex: state.nextZIndex }
          : { ...w, isFocused: false }
      ),
      nextZIndex: state.nextZIndex + 1,
    }));
  },

  updatePosition: (id, position) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id ? { ...w, position } : w
      ),
    }));
  },

  updateSize: (id, size) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id ? { ...w, size } : w
      ),
    }));
  },
}));
