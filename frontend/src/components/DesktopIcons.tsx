'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useWindowStore } from '@/stores/window.store';
import { Gamepad2, Trophy, User, Swords, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconDefs = [
  { type: 'games-app' as const, title: 'Games', icon: Gamepad2 },
  { type: 'matchmaking' as const, title: 'Online Play', icon: Swords },
  { type: 'leaderboard' as const, title: 'Leaderboard', icon: Trophy },
  { type: 'profile' as const, title: 'My Profile', icon: User },
  { type: 'chat' as const, title: 'Chat', icon: MessageSquare },
];

const GRID = 90;
const ICON_TITLES: Record<string, string> = {
  'games-app': 'Games',
};

function getInitialPositions() {
  return iconDefs.map((_, i) => ({ x: 16, y: 16 + i * GRID }));
}

export default function DesktopIcons() {
  const { openWindow } = useWindowStore();
  const [positions, setPositions] = useState(getInitialPositions);
  const [dragging, setDragging] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [iconSize, setIconSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const clickTime = useRef(0);

  const sizes = {
    small: { box: 56, icon: 18, text: '9px', iconBox: 28 },
    medium: { box: 72, icon: 24, text: '10px', iconBox: 40 },
    large: { box: 90, icon: 32, text: '11px', iconBox: 52 },
  };
  const s = sizes[iconSize];

  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setSelected(index);
    setContextMenu(null);
    setDragging(index);
    dragOffset.current = {
      x: e.clientX - positions[index].x,
      y: e.clientY - positions[index].y,
    };
  }, [positions]);

  useEffect(() => {
    if (dragging === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPositions(prev => prev.map((p, i) =>
        i === dragging
          ? { x: Math.max(0, e.clientX - dragOffset.current.x), y: Math.max(0, e.clientY - dragOffset.current.y) }
          : p
      ));
    };

    const handleMouseUp = () => setDragging(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  const handleDoubleClick = useCallback((index: number) => {
    const item = iconDefs[index];
    const title = ICON_TITLES[item.type] || item.title;
    openWindow(item.type, title);
  }, [openWindow]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDesktopClick = useCallback(() => {
    setSelected(null);
    setContextMenu(null);
  }, []);

  const arrangeIcons = useCallback(() => {
    setPositions(iconDefs.map((_, i) => ({ x: 16, y: 16 + i * GRID })));
    setContextMenu(null);
  }, []);

  return (
    <div
      className="absolute inset-0 z-[1]"
      onClick={handleDesktopClick}
      onContextMenu={handleContextMenu}
      style={{ pointerEvents: 'auto' }}
    >
      {iconDefs.map((item, index) => (
        <div
          key={item.type}
          className={cn(
            'absolute flex flex-col items-center gap-0.5 cursor-default rounded-sm',
            'hover:bg-white/10',
            selected === index && 'bg-retro-highlight/30 outline outline-1 outline-dashed outline-white/50',
            dragging === index && 'opacity-70'
          )}
          style={{
            left: positions[index].x,
            top: positions[index].y,
            width: s.box,
            padding: 4,
            zIndex: dragging === index ? 9999 : 1,
          }}
          onMouseDown={(e) => handleMouseDown(e, index)}
          onDoubleClick={() => handleDoubleClick(index)}
          onClick={(e) => { e.stopPropagation(); setSelected(index); setContextMenu(null); }}
        >
          <div
            className={cn(
              'bg-retro-button shadow-retro-button flex items-center justify-center',
              selected === index && 'bg-retro-highlight'
            )}
            style={{ width: s.iconBox, height: s.iconBox }}
          >
            <item.icon
              size={s.icon}
              className={cn(
                'text-retro-title',
                selected === index && 'text-white'
              )}
            />
          </div>
          <span
            className={cn(
              'text-white text-center leading-tight font-pixel drop-shadow-[1px_1px_0px_rgba(0,0,0,0.8)] break-words w-full',
              selected === index && 'bg-retro-highlight px-0.5'
            )}
            style={{ fontSize: s.text }}
          >
            {item.title}
          </span>
        </div>
      ))}

      {/* Right-click context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setContextMenu(null)} />
          <div
            className="absolute z-[9999] bg-retro-window border-t-[2px] border-l-[2px] border-white border-b-[2px] border-r-[2px] border-b-black border-r-black py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-1 text-[11px] text-gray-400 cursor-default">View</div>
            <button
              className={cn('w-full text-left px-6 py-0.5 text-[11px] hover:bg-retro-highlight hover:text-white', iconSize === 'large' && 'font-bold')}
              onClick={() => { setIconSize('large'); setContextMenu(null); }}
            >
              Large Icons
            </button>
            <button
              className={cn('w-full text-left px-6 py-0.5 text-[11px] hover:bg-retro-highlight hover:text-white', iconSize === 'medium' && 'font-bold')}
              onClick={() => { setIconSize('medium'); setContextMenu(null); }}
            >
              Medium Icons
            </button>
            <button
              className={cn('w-full text-left px-6 py-0.5 text-[11px] hover:bg-retro-highlight hover:text-white', iconSize === 'small' && 'font-bold')}
              onClick={() => { setIconSize('small'); setContextMenu(null); }}
            >
              Small Icons
            </button>
            <div className="border-t border-[#808080] my-1 mx-2" />
            <button
              className="w-full text-left px-3 py-0.5 text-[11px] hover:bg-retro-highlight hover:text-white"
              onClick={arrangeIcons}
            >
              Arrange Icons
            </button>
            <button
              className="w-full text-left px-3 py-0.5 text-[11px] hover:bg-retro-highlight hover:text-white"
              onClick={() => { window.location.reload(); }}
            >
              Refresh
            </button>
          </div>
        </>
      )}
    </div>
  );
}
