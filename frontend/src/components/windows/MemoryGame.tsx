'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

const EMOJIS = ['🎮', '🎲', '🎯', '🏆', '⚔️', '🛡️', '🎪', '🎨', '🚀', '💎', '🔮', '👾', '🤖', '🎸', '🌟', '🍕', '🎭', '🦄'];

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

type GridSize = 4 | 6 | 8;

function createCards(size: GridSize): Card[] {
  const pairCount = (size * size) / 2;
  const emojis = EMOJIS.slice(0, pairCount);
  const pairs = [...emojis, ...emojis];
  // Shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

export default function MemoryGame() {
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [cards, setCards] = useState<Card[]>(() => createCards(4));
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [locked, setLocked] = useState(false);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  const [bestScores, setBestScores] = useState<Record<GridSize, number | null>>({ 4: null, 6: null, 8: null });

  const totalPairs = (gridSize * gridSize) / 2;
  const won = matches === totalPairs;

  useEffect(() => {
    if (!started || won) return;
    const id = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [started, won]);

  useEffect(() => {
    if (won && started) {
      setBestScores(prev => ({
        ...prev,
        [gridSize]: prev[gridSize] === null ? moves : Math.min(prev[gridSize]!, moves),
      }));
    }
  }, [won]);

  const handleCardClick = useCallback((cardId: number) => {
    if (locked) return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.flipped || card.matched) return;
    if (flippedIds.includes(cardId)) return;

    if (!started) setStarted(true);

    const newFlipped = [...flippedIds, cardId];
    const newCards = cards.map(c => c.id === cardId ? { ...c, flipped: true } : c);
    setCards(newCards);
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      const c1 = newCards.find(c => c.id === first)!;
      const c2 = newCards.find(c => c.id === second)!;

      if (c1.emoji === c2.emoji) {
        setCards(prev => prev.map(c =>
          c.id === first || c.id === second ? { ...c, matched: true } : c
        ));
        setMatches(m => m + 1);
        setFlippedIds([]);
      } else {
        setLocked(true);
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === first || c.id === second ? { ...c, flipped: false } : c
          ));
          setFlippedIds([]);
          setLocked(false);
        }, 800);
      }
    }
  }, [cards, flippedIds, locked, started]);

  const reset = useCallback((size?: GridSize) => {
    const s = size || gridSize;
    if (size) setGridSize(size);
    setCards(createCards(s));
    setFlippedIds([]);
    setMoves(0);
    setMatches(0);
    setLocked(false);
    setTime(0);
    setStarted(false);
  }, [gridSize]);

  const cardSize = gridSize === 4 ? 72 : gridSize === 6 ? 52 : 40;

  return (
    <div className="flex flex-col items-center h-full bg-retro-window p-3 overflow-auto">
      {/* Header */}
      <div className="flex justify-between w-full mb-2 gap-2">
        <div className="retro-panel px-2 py-1 text-[11px]">
          <span className="text-gray-500">Moves: </span>
          <span className="font-bold">{moves}</span>
        </div>
        <div className="retro-panel px-2 py-1 text-[11px]">
          <span className="text-gray-500">Pairs: </span>
          <span className="font-bold">{matches}/{totalPairs}</span>
        </div>
        <div className="retro-panel px-2 py-1 text-[11px]">
          <span className="text-gray-500">Time: </span>
          <span className="font-bold">{time}s</span>
        </div>
      </div>

      {/* Size selector */}
      <div className="flex gap-0 mb-2">
        {([4, 6, 8] as GridSize[]).map(s => (
          <button
            key={s}
            className={cn(
              'px-3 py-0.5 text-[10px] border border-gray-400',
              gridSize === s ? 'bg-white font-bold' : 'bg-retro-button'
            )}
            onClick={() => reset(s)}
          >
            {s}x{s}
          </button>
        ))}
      </div>

      {/* Win message */}
      {won && (
        <div className="retro-panel-inset px-4 py-1.5 mb-2 text-[12px] font-bold text-center bg-green-100 text-green-800 w-full">
          You won in {moves} moves ({time}s)!
          {bestScores[gridSize] !== null && ` Best: ${bestScores[gridSize]} moves`}
        </div>
      )}

      {/* Card grid */}
      <div className="retro-panel-inset p-2">
        <div
          className="grid gap-[4px]"
          style={{ gridTemplateColumns: `repeat(${gridSize}, ${cardSize}px)` }}
        >
          {cards.map(card => (
            <button
              key={card.id}
              className={cn(
                'flex items-center justify-center rounded-sm transition-all duration-200 cursor-pointer',
                card.flipped || card.matched
                  ? card.matched ? 'bg-green-100 border-2 border-green-400' : 'bg-white border-2 border-blue-400'
                  : 'bg-retro-title shadow-retro-button hover:brightness-110',
              )}
              style={{ width: cardSize, height: cardSize, fontSize: cardSize * 0.5 }}
              onClick={() => handleCardClick(card.id)}
              disabled={card.flipped || card.matched}
            >
              {(card.flipped || card.matched) ? card.emoji : '?'}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mt-3">
        <button className="retro-button flex items-center gap-1 text-[10px]" onClick={() => reset()}>
          <RotateCcw size={10} /> New Game
        </button>
      </div>
    </div>
  );
}
