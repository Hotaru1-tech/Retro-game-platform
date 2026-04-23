import { create } from 'zustand';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from './auth.store';

interface GameState {
  roomId: string | null;
  matchId: string | null;
  board: any[][] | null;
  currentTurn: 'white' | 'black' | null;
  playerColor: 'white' | 'black' | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  winner: string | null;
  status: 'idle' | 'waiting' | 'playing' | 'finished';
  moveHistory: any[];
  selectedSquare: { row: number; col: number } | null;
  validMoves: { row: number; col: number }[];
  lastMove: { from: { row: number; col: number }; to: { row: number; col: number } } | null;
  players: any[];
  isInQueue: boolean;
  messages: any[];
  error: string | null;

  // Room actions
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  setReady: (isReady: boolean) => Promise<void>;
  startGame: () => Promise<void>;

  // Game actions
  selectSquare: (row: number, col: number) => void;
  makeMove: (from: { row: number; col: number }, to: { row: number; col: number }, promotion?: string) => Promise<void>;
  resign: () => Promise<void>;
  clearSelection: () => void;

  // Matchmaking
  joinQueue: () => Promise<void>;
  leaveQueue: () => Promise<void>;

  // Chat
  sendMessage: (content: string) => Promise<void>;

  // Socket listeners
  setupListeners: () => void;
  cleanup: () => void;

  // State setters
  setRoomId: (roomId: string | null) => void;
  setError: (error: string | null) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  roomId: null,
  matchId: null,
  board: null,
  currentTurn: null,
  playerColor: null,
  isCheck: false,
  isCheckmate: false,
  isStalemate: false,
  isDraw: false,
  winner: null,
  status: 'idle',
  moveHistory: [],
  selectedSquare: null,
  validMoves: [],
  lastMove: null,
  players: [],
  isInQueue: false,
  messages: [],
  error: null,

  joinRoom: async (roomId: string) => {
    const socket = getSocket();
    socket.emit('join_room', { roomId });
    set({ roomId });
  },

  leaveRoom: async () => {
    const socket = getSocket();
    const { roomId } = get();
    if (roomId) socket.emit('leave_room', { roomId });
    set({
      roomId: null, matchId: null, board: null, currentTurn: null,
      playerColor: null, status: 'idle', moveHistory: [], players: [],
      selectedSquare: null, validMoves: [], lastMove: null, messages: [],
    });
  },

  setReady: async (isReady: boolean) => {
    const socket = getSocket();
    const { roomId } = get();
    if (roomId) socket.emit('ready', { roomId, isReady });
  },

  startGame: async () => {
    const socket = getSocket();
    const { roomId } = get();
    if (roomId) socket.emit('start_game', { roomId });
  },

  selectSquare: (row: number, col: number) => {
    const { board, playerColor, currentTurn, matchId, selectedSquare, validMoves } = get();

    if (currentTurn !== playerColor) return;
    if (!board || !matchId) return;

    // If clicking on a valid move, make the move
    if (selectedSquare && validMoves.some(m => m.row === row && m.col === col)) {
      void get().makeMove(selectedSquare, { row, col });
      return;
    }

    const piece = board[row]?.[col];
    if (piece && piece.color === playerColor) {
      set({ selectedSquare: { row, col } });
      const socket = getSocket();
      socket.emit('get_valid_moves', { matchId, row, col });
    } else {
      set({ selectedSquare: null, validMoves: [] });
    }
  },

  makeMove: async (from, to, promotion) => {
    const socket = getSocket();
    const { matchId, board } = get();
    if (!matchId) return;

    // Check if pawn promotion
    const piece = board?.[from.row]?.[from.col];
    if (piece?.type === 'pawn' && (to.row === 0 || to.row === 7) && !promotion) {
      // Default to queen promotion
      promotion = 'queen';
    }

    socket.emit('player_move', { matchId, from, to, promotion });
    set({ selectedSquare: null, validMoves: [] });
  },

  resign: async () => {
    const socket = getSocket();
    const { matchId } = get();
    if (matchId) socket.emit('resign', { matchId });
  },

  clearSelection: () => {
    set({ selectedSquare: null, validMoves: [] });
  },

  joinQueue: async () => {
    const socket = getSocket();
    socket.emit('join_queue', { gameType: 'chess' });
    set({ isInQueue: true });
  },

  leaveQueue: async () => {
    const socket = getSocket();
    socket.emit('leave_queue');
    set({ isInQueue: false });
  },

  sendMessage: async (content: string) => {
    const socket = getSocket();
    const { roomId } = get();
    if (roomId) socket.emit('chat_message', { roomId, content });
  },

  setupListeners: () => {
    const socket = getSocket();

    socket.on('room_updated', (room: any) => {
      set({ players: room.players, roomId: room.id });
    });

    socket.on('joined_room', (room: any) => {
      set({ players: room.players, roomId: room.id, status: 'waiting' });
    });

    socket.on('game_started', (data: any) => {
      const userId = useAuthStore.getState().user?.id;
      const playerColor = data.whitePlayerId === userId ? 'white' : 'black';

      set({
        matchId: data.matchId,
        board: data.gameState.board,
        currentTurn: data.gameState.currentTurn,
        playerColor,
        status: 'playing',
        moveHistory: [],
        isCheck: false,
        isCheckmate: false,
        isStalemate: false,
        isDraw: false,
        winner: null,
      });
    });

    socket.on('game_state_update', (data: any) => {
      set({
        board: data.gameState.board,
        currentTurn: data.gameState.currentTurn,
        isCheck: data.gameState.isCheck,
        moveHistory: data.gameState.moveHistory || [],
        lastMove: data.lastMove ? { from: data.lastMove.from, to: data.lastMove.to } : null,
      });
    });

    socket.on('game_over', (data: any) => {
      set({
        status: 'finished',
        winner: data.winner,
        isCheckmate: data.isCheckmate || false,
        isStalemate: data.isStalemate || false,
        isDraw: data.isDraw || false,
      });
    });

    socket.on('valid_moves', (data: any) => {
      set({ validMoves: data.moves });
    });

    socket.on('match_found', (data: any) => {
      set({ roomId: data.roomId, isInQueue: false, status: 'waiting' });
      socket.emit('join_room', { roomId: data.roomId });
    });

    socket.on('queue_joined', () => {
      set({ isInQueue: true });
    });

    socket.on('queue_left', () => {
      set({ isInQueue: false });
    });

    socket.on('chat_message', (msg: any) => {
      set(state => ({ messages: [...state.messages, msg] }));
    });

    socket.on('player_disconnected', (data: any) => {
      set(state => ({
        messages: [...state.messages, {
          id: Date.now().toString(),
          content: `${data.username} ${data.permanent ? 'left' : 'disconnected (30s to reconnect)'}`,
          system: true,
          createdAt: new Date(),
        }],
      }));
    });

    socket.on('player_reconnected', (data: any) => {
      set(state => ({
        messages: [...state.messages, {
          id: Date.now().toString(),
          content: `${data.username} reconnected`,
          system: true,
          createdAt: new Date(),
        }],
      }));
    });

    socket.on('error', (data: any) => {
      set({ error: data.message });
      setTimeout(() => set({ error: null }), 5000);
    });
  },

  cleanup: () => {
    const socket = getSocket();
    socket.off('room_updated');
    socket.off('joined_room');
    socket.off('game_started');
    socket.off('game_state_update');
    socket.off('game_over');
    socket.off('valid_moves');
    socket.off('match_found');
    socket.off('queue_joined');
    socket.off('queue_left');
    socket.off('chat_message');
    socket.off('player_disconnected');
    socket.off('player_reconnected');
    socket.off('error');
  },

  setRoomId: (roomId) => set({ roomId }),
  setError: (error) => set({ error }),
}));
