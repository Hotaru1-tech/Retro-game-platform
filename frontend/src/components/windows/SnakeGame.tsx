'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { RotateCcw, Play, Pause } from 'lucide-react';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Point = { x: number; y: number };

function randomFood(snake: Point[]): Point {
  let food: Point;
  do {
    food = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
  } while (snake.some(s => s.x === food.x && s.y === food.y));
  return food;
}

export default function SnakeGame() {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const dirRef = useRef<Direction>('RIGHT');
  const gameRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    const initial = [{ x: 10, y: 10 }];
    setSnake(initial);
    setFood(randomFood(initial));
    setDirection('RIGHT');
    dirRef.current = 'RIGHT';
    setGameOver(false);
    setRunning(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
  }, []);

  const tick = useCallback(() => {
    setSnake(prev => {
      const head = { ...prev[0] };
      const dir = dirRef.current;

      if (dir === 'UP') head.y -= 1;
      else if (dir === 'DOWN') head.y += 1;
      else if (dir === 'LEFT') head.x -= 1;
      else head.x += 1;

      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameOver(true);
        setRunning(false);
        return prev;
      }

      if (prev.some(s => s.x === head.x && s.y === head.y)) {
        setGameOver(true);
        setRunning(false);
        return prev;
      }

      const newSnake = [head, ...prev];

      setFood(currentFood => {
        if (head.x === currentFood.x && head.y === currentFood.y) {
          setScore(s => {
            const newScore = s + 10;
            setHighScore(h => Math.max(h, newScore));
            if (newScore % 50 === 0) {
              setSpeed(sp => Math.max(50, sp - 10));
            }
            return newScore;
          });
          const nextFood = randomFood(newSnake);
          return nextFood;
        } else {
          newSnake.pop();
          return currentFood;
        }
      });

      return newSnake;
    });
  }, []);

  useEffect(() => {
    if (running && !gameOver) {
      gameRef.current = setInterval(tick, speed);
      return () => { if (gameRef.current) clearInterval(gameRef.current); };
    }
  }, [running, gameOver, tick, speed]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key;
      if (key === 'ArrowUp' || key === 'w') { if (dirRef.current !== 'DOWN') { dirRef.current = 'UP'; setDirection('UP'); } }
      else if (key === 'ArrowDown' || key === 's') { if (dirRef.current !== 'UP') { dirRef.current = 'DOWN'; setDirection('DOWN'); } }
      else if (key === 'ArrowLeft' || key === 'a') { if (dirRef.current !== 'RIGHT') { dirRef.current = 'LEFT'; setDirection('LEFT'); } }
      else if (key === 'ArrowRight' || key === 'd') { if (dirRef.current !== 'LEFT') { dirRef.current = 'RIGHT'; setDirection('RIGHT'); } }
      else if (key === ' ') {
        e.preventDefault();
        if (gameOver) reset();
        else setRunning(r => !r);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameOver, reset]);

  return (
    <div className="flex flex-col items-center h-full bg-retro-window p-3">
      {/* Score bar */}
      <div className="flex justify-between w-full mb-2">
        <div className="retro-panel px-3 py-1 text-[11px]">
          <span className="text-gray-500">Score: </span>
          <span className="font-bold text-[14px]">{score}</span>
        </div>
        <div className="retro-panel px-3 py-1 text-[11px]">
          <span className="text-gray-500">Best: </span>
          <span className="font-bold text-[14px]">{highScore}</span>
        </div>
      </div>

      {/* Game board */}
      <div className="retro-panel-inset p-1 relative">
        <div
          className="bg-[#9bbc0f] relative"
          style={{ width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE }}
        >
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
            }}
          />

          {/* Snake */}
          {snake.map((segment, i) => (
            <div
              key={i}
              className={cn(
                'absolute rounded-[2px]',
                i === 0 ? 'bg-[#306230]' : 'bg-[#4a752c]'
              )}
              style={{
                left: segment.x * CELL_SIZE + 1,
                top: segment.y * CELL_SIZE + 1,
                width: CELL_SIZE - 2,
                height: CELL_SIZE - 2,
              }}
            >
              {i === 0 && (
                <div className="flex items-center justify-center w-full h-full text-[8px]">
                  {direction === 'RIGHT' ? '>' : direction === 'LEFT' ? '<' : direction === 'UP' ? '^' : 'v'}
                </div>
              )}
            </div>
          ))}

          {/* Food */}
          <div
            className="absolute bg-red-600 rounded-full"
            style={{
              left: food.x * CELL_SIZE + 2,
              top: food.y * CELL_SIZE + 2,
              width: CELL_SIZE - 4,
              height: CELL_SIZE - 4,
            }}
          />

          {/* Overlays */}
          {!running && !gameOver && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-[14px] font-bold font-pixel mb-2">SNAKE</div>
                <div className="text-[10px]">Press SPACE or click Play</div>
                <div className="text-[9px] mt-1 text-gray-300">Arrow keys / WASD to move</div>
              </div>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-[14px] font-bold font-pixel text-red-400 mb-1">GAME OVER</div>
                <div className="text-[12px] mb-2">Score: {score}</div>
                <div className="text-[9px] text-gray-300">Press SPACE to restart</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mt-3">
        <button
          className="retro-button flex items-center gap-1 text-[10px]"
          onClick={() => { if (gameOver) reset(); else setRunning(r => !r); }}
        >
          {gameOver ? <><RotateCcw size={10} /> Restart</> : running ? <><Pause size={10} /> Pause</> : <><Play size={10} /> Play</>}
        </button>
        <button className="retro-button flex items-center gap-1 text-[10px]" onClick={reset}>
          <RotateCcw size={10} /> Reset
        </button>
      </div>
    </div>
  );
}
